import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordEvent } from "@/lib/outbox";
import { relayNow } from "@/lib/outbox-relay";
import { z } from "zod";

const schema = z.object({
  sender: z.object({
    name:    z.string().min(1),
    phone:   z.string().min(10),
    email:   z.string().email().optional().or(z.literal("")),
    address: z.string().min(5),
  }),
  fromCityId:       z.string().min(1),
  toCityId:         z.string().min(1),
  shippingDate:     z.string().min(1),
  items: z.array(z.object({
    description: z.string().min(1),
    weightKg:    z.number().positive(),
    lengthCm:    z.number().int().positive(),
    breadthCm:   z.number().int().positive(),
    heightCm:    z.number().int().positive(),
  })).min(1),
  legs: z.array(z.object({
    tripId:       z.string(),
    fromStopId:   z.string(),
    toStopId:     z.string(),
    distanceKm:   z.number(),
    transferType: z.enum(["ORIGIN", "INTERIM", "FINAL"]),
    agentId:      z.string().optional(),
    agentCharge:  z.number().default(0),
  })).min(1),
  freightCost:       z.number(),
  agentCost:         z.number(),
  recipientName:     z.string().min(1),
  recipientPhone:    z.string().min(10),
  recipientWhatsapp: z.string().optional().or(z.literal("")),
  recipientEmail:    z.string().email().optional().or(z.literal("")),
  recipientAddress:  z.string().min(5),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agentId = session.user.agentId!;

  let body: any;
  try {
    body = schema.parse(await req.json());
  } catch (err: any) {
    return NextResponse.json({ error: err.issues?.[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const config = await prisma.agentChargeConfig.findFirst({ where: { isActive: true } });
  const originPct   = Number(config?.agentOriginPct   ?? 5)  / 100;
  const commPct     = Number(config?.agentFreightComm  ?? 5)  / 100;

  // AgentOrigin charge: agent picks up freight from sender and brings to bus
  // station. Origin handling is already included in body.agentCost by the
  // search endpoint, so it's NOT re-added to the total here — originCharge is
  // kept only to record the origin agent's earning below.
  const originCharge = Math.round(body.freightCost * originPct);
  const totalCost    = body.freightCost + body.agentCost;

  const booking = await prisma.$transaction(async (tx) => {
    // Origin-city approved agent — assigned to the ORIGIN leg for handling/notification.
    const originAgent = await tx.agent.findFirst({
      where:  { cityId: body.fromCityId, status: "APPROVED" },
      select: { id: true },
    });

    // ── Find or create walk-in user by phone ──────────────────
    let walkinUser = await tx.user.findUnique({ where: { phone: body.sender.phone } });

    if (!walkinUser) {
      walkinUser = await tx.user.create({
        data: {
          name:  body.sender.name,
          phone: body.sender.phone,
          email: body.sender.email || null,
          role:  "PASSENGER",
        },
      });
      await tx.passengerProfile.create({
        data: { userId: walkinUser.id, address: body.sender.address },
      });
    }

    // ── Create freight booking ────────────────────────────────
    const fb = await tx.freightBooking.create({
      data: {
        senderId:          walkinUser.id,
        senderName:        body.sender.name,
        senderPhone:       body.sender.phone,
        bookedByAgentId:   agentId,
        fromCityId:        body.fromCityId,
        toCityId:          body.toCityId,
        shippingDate:      new Date(body.shippingDate),
        freightCost:       body.freightCost,
        agentCost:         body.agentCost,
        totalCost,
        recipientName:     body.recipientName,
        recipientPhone:    body.recipientPhone,
        recipientWhatsapp: body.recipientWhatsapp || null,
        recipientEmail:    body.recipientEmail    || null,
        recipientAddress:  body.recipientAddress,
        status:            "CONFIRMED", // agent booking is auto-confirmed (cash payment at source)
        items: {
          create: body.items.map((i: any) => ({
            description: i.description,
            weightKg:    i.weightKg,
            lengthCm:    i.lengthCm,
            breadthCm:   i.breadthCm,
            heightCm:    i.heightCm,
          })),
        },
        legs: {
          create: body.legs.map((leg: any, idx: number) => ({
            legOrder:     idx + 1,
            stopId:       leg.fromStopId,
            toStopId:     leg.toStopId,
            transferType: leg.transferType,
            tripId:       leg.tripId,
            distanceKm:   leg.distanceKm,
            agentId:      leg.agentId ?? (leg.transferType === "ORIGIN" ? originAgent?.id ?? null : null),
            agentCharge:  leg.agentCharge,
          })),
        },
      },
      include: { items: true, legs: true },
    });

    // Cash collected at source — record the payment as already settled.
    await tx.freightPayment.create({
      data: {
        freightBookingId: fb.id,
        amount:           totalCost,
        method:           "CASH",
        status:           "SUCCESS",
        completedAt:      new Date(),
      },
    });

    // Outbox event — commits atomically with the booking; relay emails leg agents.
    // The walk-in booking is created CONFIRMED (paid in cash), so agents are
    // notified immediately, mirroring the post-payment passenger flow.
    await recordEvent(tx, {
      aggregate:   "FreightBooking",
      aggregateId: fb.id,
      type:        "freight.booking.created",
      payload:     { bookingRef: fb.bookingRef },
    });

    const today = new Date();

    // AgentOrigin earning — agent collected freight from sender
    await tx.agentEarning.create({
      data: {
        agentId,
        type:        "FREIGHT_HANDLING_ORIGIN",
        amount:      originCharge,
        referenceId: fb.id,
        date:        today,
      },
    });

    // Freight commission earning
    await tx.agentEarning.create({
      data: {
        agentId,
        type:        "FREIGHT_COMMISSION",
        amount:      body.freightCost * commPct,
        referenceId: fb.id,
        date:        today,
      },
    });

    return { booking: fb, walkinUserId: walkinUser!.id, isNewUser: !walkinUser };
  });

  // Email every agent assigned to a leg now that the booking is committed.
  await relayNow();

  return NextResponse.json({
    bookingRef:  booking.booking.bookingRef,
    totalCost,
    originCharge,
    walkinUserId: booking.walkinUserId,
  }, { status: 201 });
}
