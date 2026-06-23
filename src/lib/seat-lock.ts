import { prisma } from "@/lib/prisma";
import { occupantInterval, segmentsOverlap, bookingInterval, type StopLite } from "@/lib/segment";

const LOCK_DURATION_MINUTES = 5;

// Abandoned-checkout grace period. A PENDING booking that hasn't been paid
// within this window is auto-cancelled so its seat returns to inventory —
// otherwise an unfinished checkout would hold the segment forever.
const PENDING_TTL_MINUTES = 15;

/**
 * Auto-cancel stale PENDING bookings on a trip (no successful payment, older
 * than the grace period) so their seats are freed. Idempotent; called lazily
 * from inventory reads/locks. PENDING implies payment hasn't completed
 * (payment success flips the booking to CONFIRMED), but we still guard against
 * a paid-but-not-yet-confirmed booking via the payment-status check.
 */
export async function expireStalePendingBookings(tripId: string): Promise<void> {
  const cutoff = new Date(Date.now() - PENDING_TTL_MINUTES * 60 * 1000);
  await prisma.booking.updateMany({
    where: {
      tripId,
      status: "PENDING",
      createdAt: { lt: cutoff },
      NOT: { payment: { status: "SUCCESS" } },
    },
    data: { status: "CANCELLED_USER", cancellationReason: "Payment not completed in time" },
  });
}

type SeatSegment = { boardingStopId?: string | null; droppingStopId?: string | null };

async function tripStops(tripId: string): Promise<StopLite[]> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { schedule: { select: { route: { select: { stops: {
      select: { id: true, cityId: true, stopOrder: true, distanceFromOriginKm: true },
      orderBy: { stopOrder: "asc" },
    } } } } } },
  });
  return trip?.schedule.route.stops ?? [];
}

/**
 * Lock seats for a user for a specific segment. A seat can be locked only if no
 * unexpired lock by another user, and no active (non-cancelled) booking, covers
 * an OVERLAPPING segment. Runs Serializable so concurrent lock attempts on
 * overlapping segments can't both succeed — this is the overselling guard now
 * that the DB no longer has a unique (tripId, seatId) constraint.
 */
export async function lockSeats(
  tripId: string,
  seatIds: string[],
  userId: string,
  segment: SeatSegment = {},
): Promise<{ success: boolean; message?: string; expiresAt?: Date }> {
  const stops = await tripStops(tripId);
  const req = occupantInterval(stops, segment.boardingStopId ?? null, segment.droppingStopId ?? null);
  const expiresAt = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);

  // Free up seats held by abandoned checkouts before checking conflicts.
  await expireStalePendingBookings(tripId);

  const run = () =>
    prisma.$transaction(async (tx) => {
      const now = new Date();

      // Drop globally-expired locks and this user's prior locks on these seats
      // (so re-locking / changing segment is idempotent).
      await tx.seatLock.deleteMany({ where: { expiresAt: { lt: now } } });
      await tx.seatLock.deleteMany({ where: { tripId, seatId: { in: seatIds }, userId } });

      // Locks held by other users on these seats
      const otherLocks = await tx.seatLock.findMany({
        where: { tripId, seatId: { in: seatIds }, expiresAt: { gte: now }, userId: { not: userId } },
        select: { seatId: true, boardingStopId: true, droppingStopId: true },
      });
      for (const l of otherLocks) {
        const iv = occupantInterval(stops, l.boardingStopId, l.droppingStopId);
        if (segmentsOverlap(req.board, req.drop, iv.board, iv.drop)) {
          return { success: false as const, message: "One or more seats are no longer available." };
        }
      }

      // Active bookings on these seats
      const seats = await tx.bookingsSeat.findMany({
        where: { tripId, seatId: { in: seatIds }, booking: { status: { notIn: ["CANCELLED_USER", "CANCELLED_OPERATOR", "REFUNDED"] } } },
        select: {
          seatId: true,
          booking: { select: { boardingStopId: true, droppingStopId: true, boardingStopOrder: true, droppingStopOrder: true } },
        },
      });
      for (const s of seats) {
        const iv = bookingInterval(stops, s.booking);
        if (segmentsOverlap(req.board, req.drop, iv.board, iv.drop)) {
          return { success: false as const, message: "One or more seats are already booked." };
        }
      }

      await tx.seatLock.createMany({
        data: seatIds.map((seatId) => ({
          tripId, seatId, userId, expiresAt,
          boardingStopId: segment.boardingStopId ?? null,
          droppingStopId: segment.droppingStopId ?? null,
        })),
      });

      return { success: true as const, expiresAt };
    }, { isolationLevel: "Serializable" });

  try {
    return await run();
  } catch (err: any) {
    // Retry once on serialization failure
    if (err?.code === "P2034") {
      try { return await run(); } catch { /* fall through */ }
    }
    return { success: false, message: "One or more seats are no longer available." };
  }
}

export async function releaseSeats(tripId: string, seatIds: string[], userId: string) {
  await prisma.seatLock.deleteMany({
    where: { tripId, seatId: { in: seatIds }, userId },
  });
}

export async function getUserLock(
  tripId: string,
  userId: string
): Promise<{ seatIds: string[]; expiresAt: Date | null }> {
  const locks = await prisma.seatLock.findMany({
    where: { tripId, userId, expiresAt: { gte: new Date() } },
  });

  return {
    seatIds: locks.map((l) => l.seatId),
    expiresAt: locks[0]?.expiresAt ?? null,
  };
}
