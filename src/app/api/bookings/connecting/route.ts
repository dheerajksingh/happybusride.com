import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateFare } from "@/lib/fare";
import { z } from "zod";

const schema = z.object({
  leg1: z.object({
    tripId: z.string().min(1),
    scheduleId: z.string().min(1),
    seatIds: z.array(z.string()).min(1),
    baseFare: z.number().positive(),
  }),
  leg2: z.object({
    tripId: z.string().min(1),
    scheduleId: z.string().min(1),
    seatIds: z.array(z.string()).min(1),
    baseFare: z.number().positive(),
  }),
  passengers: z.array(z.object({
    name: z.string().min(1),
    age: z.coerce.number().min(1).max(120),
    gender: z.string(),
    leg1SeatId: z.string(),
    leg2SeatId: z.string(),
  })),
  paymentMethod: z.enum(["UPI", "CARD", "WALLET"]).default("UPI"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = schema.parse(body);
    const { paymentMethod } = data;

    if (data.leg1.seatIds.length !== data.passengers.length || data.leg2.seatIds.length !== data.passengers.length) {
      return NextResponse.json({ error: "Seat count must match passenger count for both legs" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check seat availability for both legs
      const [taken1, taken2] = await Promise.all([
        tx.bookingsSeat.findMany({ where: { tripId: data.leg1.tripId, seatId: { in: data.leg1.seatIds } }, select: { seatId: true } }),
        tx.bookingsSeat.findMany({ where: { tripId: data.leg2.tripId, seatId: { in: data.leg2.seatIds } }, select: { seatId: true } }),
      ]);

      if (taken1.length > 0) throw new Error(`Leg 1 seats already booked: ${taken1.map(t => t.seatId).join(", ")}`);
      if (taken2.length > 0) throw new Error(`Leg 2 seats already booked: ${taken2.map(t => t.seatId).join(", ")}`);

      const group = await tx.connectingBookingGroup.create({ data: {} });

      const fare1 = calculateFare(data.leg1.baseFare, data.leg1.seatIds.length);
      const fare2 = calculateFare(data.leg2.baseFare, data.leg2.seatIds.length);

      const [booking1, booking2] = await Promise.all([
        tx.booking.create({
          data: {
            userId: session.user.id,
            tripId: data.leg1.tripId,
            status: "PENDING",
            baseFare: fare1.baseFare,
            gstAmount: fare1.gstAmount,
            convenienceFee: fare1.convenienceFee,
            discount: fare1.discount,
            totalAmount: fare1.totalAmount,
            connectingGroupId: group.id,
            passengers: {
              create: data.passengers.map(p => ({
                name: p.name, age: p.age, gender: p.gender, seatId: p.leg1SeatId,
              })),
            },
            seats: {
              create: data.leg1.seatIds.map(seatId => ({ seatId, tripId: data.leg1.tripId })),
            },
          },
        }),
        tx.booking.create({
          data: {
            userId: session.user.id,
            tripId: data.leg2.tripId,
            status: "PENDING",
            baseFare: fare2.baseFare,
            gstAmount: fare2.gstAmount,
            convenienceFee: fare2.convenienceFee,
            discount: fare2.discount,
            totalAmount: fare2.totalAmount,
            connectingGroupId: group.id,
            passengers: {
              create: data.passengers.map(p => ({
                name: p.name, age: p.age, gender: p.gender, seatId: p.leg2SeatId,
              })),
            },
            seats: {
              create: data.leg2.seatIds.map(seatId => ({ seatId, tripId: data.leg2.tripId })),
            },
          },
        }),
      ]);

      const mockTxnId = `TXN${Date.now()}`;
      await Promise.all([
        tx.payment.create({
          data: {
            bookingId: booking1.id,
            amount: fare1.totalAmount,
            method: paymentMethod,
            status: "SUCCESS",
            gatewayTxnId: mockTxnId + "_L1",
            completedAt: new Date(),
          },
        }),
        tx.payment.create({
          data: {
            bookingId: booking2.id,
            amount: fare2.totalAmount,
            method: paymentMethod,
            status: "SUCCESS",
            gatewayTxnId: mockTxnId + "_L2",
            completedAt: new Date(),
          },
        }),
        tx.booking.update({ where: { id: booking1.id }, data: { status: "CONFIRMED" } }),
        tx.booking.update({ where: { id: booking2.id }, data: { status: "CONFIRMED" } }),
      ]);

      return { group, booking1, booking2 };
    });

    return NextResponse.json({
      success: true,
      groupId: result.group.id,
      booking1: { bookingId: result.booking1.id, pnr: result.booking1.pnr, amount: result.booking1.totalAmount },
      booking2: { bookingId: result.booking2.id, pnr: result.booking2.pnr, amount: result.booking2.totalAmount },
    }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    if (err.message?.includes("seats already booked")) return NextResponse.json({ error: err.message }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
