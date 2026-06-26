import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initiatePayment } from "@/lib/payment";
import { z } from "zod";

const itemSchema = z.object({
  description: z.string().min(1),
  weightKg:    z.number().positive(),
  lengthCm:    z.number().int().positive(),
  breadthCm:   z.number().int().positive(),
  heightCm:    z.number().int().positive(),
});

const legSchema = z.object({
  tripId:      z.string(),
  fromStopId:  z.string(),
  toStopId:    z.string(),
  distanceKm:  z.number(),
  transferType: z.enum(["ORIGIN", "INTERIM", "FINAL"]),
  agentId:     z.string().optional(),
  agentCharge: z.number().default(0),
});

const schema = z.object({
  fromCityId:       z.string(),
  toCityId:         z.string(),
  shippingDate:     z.string(),
  items:            z.array(itemSchema).min(1),
  legs:             z.array(legSchema).min(1),
  freightCost:      z.number(),
  agentCost:        z.number(),
  totalCost:        z.number(),
  senderName:       z.string().min(1),
  senderPhone:      z.string().min(10),
  senderEmail:      z.string().email().optional().or(z.literal("")),
  senderWhatsapp:   z.string().optional(),
  recipientName:    z.string().min(1),
  recipientPhone:   z.string().min(10),
  recipientWhatsapp: z.string().optional(),
  recipientEmail:   z.string().email().optional(),
  recipientAddress: z.string().min(5),
  bookedByAgentId:  z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["PASSENGER", "AGENT"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const booking = await prisma.$transaction(async (tx) => {
      // The ORIGIN leg's handling agent is the approved agent in the origin city.
      // Search guarantees one exists; persist it so the origin agent is recorded
      // and notified alongside the transfer/destination agents.
      const originAgent = await tx.agent.findFirst({
        where:  { cityId: data.fromCityId, status: "APPROVED" },
        select: { id: true },
      });

      const fb = await tx.freightBooking.create({
        data: {
          senderId:         session.user.id,
          senderName:       data.senderName,
          senderPhone:      data.senderPhone,
          senderEmail:      data.senderEmail   || null,
          senderWhatsapp:   data.senderWhatsapp || null,
          bookedByAgentId:  data.bookedByAgentId ?? null,
          fromCityId:       data.fromCityId,
          toCityId:         data.toCityId,
          shippingDate:     new Date(data.shippingDate),
          freightCost:      data.freightCost,
          agentCost:        data.agentCost,
          totalCost:        data.totalCost,
          recipientName:    data.recipientName,
          recipientPhone:   data.recipientPhone,
          recipientWhatsapp: data.recipientWhatsapp,
          recipientEmail:   data.recipientEmail,
          recipientAddress: data.recipientAddress,
          status:           "PENDING_PAYMENT",
          items: {
            create: data.items.map(i => ({
              description: i.description,
              weightKg:    i.weightKg,
              lengthCm:    i.lengthCm,
              breadthCm:   i.breadthCm,
              heightCm:    i.heightCm,
            })),
          },
          legs: {
            create: data.legs.map((leg, idx) => ({
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

      // No outbox event here: the booking is still PENDING_PAYMENT. Agents are
      // notified only once payment is confirmed — see /api/freight/confirm.

      // Record agent commission if booked by agent
      if (data.bookedByAgentId) {
        const config = await tx.agentChargeConfig.findFirst({ where: { isActive: true } });
        const commPct = Number(config?.agentFreightComm ?? 5) / 100;
        await tx.agentEarning.create({
          data: {
            agentId:     data.bookedByAgentId,
            type:        "FREIGHT_COMMISSION",
            amount:      data.freightCost * commPct,
            referenceId: fb.id,
            date:        new Date(),
          },
        });
      }

      return fb;
    });

    // Initiate a mock payment for the booking. The passenger confirms it via
    // /api/freight/confirm, which flips the booking to CONFIRMED and notifies
    // the assigned agents.
    const payment = await initiatePayment(booking.id, data.totalCost, "UPI");
    await prisma.freightPayment.create({
      data: {
        freightBookingId: booking.id,
        amount:           data.totalCost,
        method:           "UPI",
        status:           "PENDING",
        gatewayTxnId:     payment.gatewayTxnId,
      },
    });

    return NextResponse.json(
      { booking, bookingId: booking.id, bookingRef: booking.bookingRef, paymentId: payment.paymentId },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.issues) return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }
}
