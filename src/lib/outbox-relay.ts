import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const MAX_ATTEMPTS = 5;

const TRANSFER_LABEL: Record<string, string> = {
  ORIGIN:  "Origin pickup",
  INTERIM: "Transfer",
  FINAL:   "Final delivery",
};

/**
 * Handle a freight.booking.created event: email every agent who has a leg on
 * the booking (origin, transfers, destination) about the freight they must
 * handle. One email per agent, even if they own multiple legs.
 */
async function handleBookingCreated(bookingId: string) {
  const booking = await prisma.freightBooking.findUnique({
    where: { id: bookingId },
    include: {
      fromCity: { select: { name: true } },
      toCity:   { select: { name: true } },
      sender:   { select: { name: true, phone: true } },
      items:    true,
      legs: {
        orderBy: { legOrder: "asc" },
        include: {
          agent:  { select: { id: true, fullName: true, user: { select: { email: true } } } },
          stop:   { include: { city: { select: { name: true } } } },
          toStop: { include: { city: { select: { name: true } } } },
        },
      },
    },
  });

  if (!booking) throw new Error(`FreightBooking ${bookingId} not found`);

  // Group legs by agent (skip legs with no assigned agent)
  type LegWithAgent = (typeof booking.legs)[number];
  const byAgent = new Map<string, { name: string; email: string | null; legs: LegWithAgent[] }>();
  for (const leg of booking.legs) {
    if (!leg.agent) continue;
    const cur = byAgent.get(leg.agent.id) ?? {
      name:  leg.agent.fullName,
      email: leg.agent.user?.email ?? null,
      legs:  [],
    };
    cur.legs.push(leg);
    byAgent.set(leg.agent.id, cur);
  }

  const shipDate = booking.shippingDate.toISOString().slice(0, 10);
  const itemsText = booking.items
    .map(i => `  • ${i.description} — ${Number(i.weightKg)}kg, ${i.lengthCm}×${i.breadthCm}×${i.heightCm}cm`)
    .join("\n");

  let skipped = 0;
  for (const [, info] of byAgent) {
    if (!info.email) { skipped++; continue; } // agent has no email on file

    const legLines = info.legs
      .map(l => {
        const from = l.stop?.city?.name ?? "?";
        const to   = l.toStop?.city?.name ?? booking.toCity.name;
        const role = TRANSFER_LABEL[l.transferType] ?? l.transferType;
        const fee  = Number(l.agentCharge) > 0 ? ` — your charge ₹${Number(l.agentCharge)}` : "";
        return `  • [${role}] ${from} → ${to}${fee}`;
      })
      .join("\n");

    const text =
`Hello ${info.name},

A new freight booking has been assigned to you.

Booking ref: ${booking.bookingRef}
Route: ${booking.fromCity.name} → ${booking.toCity.name}
Shipping date: ${shipDate}
Sender: ${booking.sender?.name ?? "—"} (${booking.sender?.phone ?? "—"})
Recipient: ${booking.recipientName} (${booking.recipientPhone})

Items:
${itemsText}

Your leg(s) on this shipment:
${legLines}

Please log in to the agent portal to receive and manage this shipment.`;

    await sendEmail({
      to: info.email,
      subject: `New freight to handle — ${booking.bookingRef} (${booking.fromCity.name} → ${booking.toCity.name})`,
      text,
    });
  }

  if (skipped > 0) {
    console.warn(`[outbox] booking ${booking.bookingRef}: ${skipped} agent(s) had no email and were not notified`);
  }
}

/** Route an event to its handler. Unknown types are acked (marked published). */
async function dispatch(ev: { type: string; aggregateId: string }) {
  switch (ev.type) {
    case "freight.booking.created":
      return handleBookingCreated(ev.aggregateId);
    default:
      return; // no-op: ack unknown event types so they don't get stuck
  }
}

/**
 * Claim and publish a batch of pending outbox events.
 * `FOR UPDATE SKIP LOCKED` makes concurrent relay runs safe.
 * Returns the number of events processed this pass.
 */
export async function drainOutbox(batchSize = 50): Promise<number> {
  // 1) Atomically claim a batch
  const claimedIds = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM outbox_events
      WHERE status = 'PENDING'
      ORDER BY "createdAt"
      FOR UPDATE SKIP LOCKED
      LIMIT ${batchSize}`;
    const ids = rows.map(r => r.id);
    if (ids.length) {
      await tx.outboxEvent.updateMany({
        where: { id: { in: ids } },
        data:  { status: "PROCESSING" },
      });
    }
    return ids;
  });

  if (!claimedIds.length) return 0;

  // 2) Publish each (outside the lock), then mark the outcome
  const events = await prisma.outboxEvent.findMany({ where: { id: { in: claimedIds } } });
  for (const ev of events) {
    try {
      await dispatch(ev);
      await prisma.outboxEvent.update({
        where: { id: ev.id },
        data:  { status: "PUBLISHED", publishedAt: new Date() },
      });
    } catch (err: any) {
      const attempts = ev.attempts + 1;
      await prisma.outboxEvent.update({
        where: { id: ev.id },
        data: {
          status:   attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING", // retry until cap
          attempts,
          lastError: String(err?.message ?? err).slice(0, 500),
        },
      });
    }
  }

  return events.length;
}

/**
 * Fire the relay once, swallowing any error. Safe to `await` directly inside a
 * request handler — it will never throw and so can never fail the booking that
 * triggered it. Used to deliver freight-booking emails immediately after the
 * booking commits, without waiting for the periodic cron drain.
 */
export async function relayNow(): Promise<void> {
  try {
    await drainOutbox();
  } catch (err) {
    console.error("[outbox] inline relay failed", err);
  }
}
