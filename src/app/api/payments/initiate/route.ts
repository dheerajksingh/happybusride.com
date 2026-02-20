import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateFare, calculateCommission } from "@/lib/fare";
import { initiatePayment } from "@/lib/payment";

const schema = z.object({
  tripId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(["WALLET", "UPI", "CARD", "CASH"]),
  seatIds: z.array(z.string()).min(1).max(6),
  passengers: z.array(z.object({
    name: z.string().min(1),
    age: z.number().min(1).max(120),
    gender: z.string(),
    seatId: z.string(),
  })),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = schema.parse(body);

    const trip = await prisma.trip.findUnique({
      where: { id: data.tripId },
      include: {
        schedule: {
          include: {
            bus: { include: { operator: true } },
            route: true,
          },
        },
      },
    });

    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    // Verify seat locks belong to this user
    const locks = await prisma.seatLock.findMany({
      where: {
        tripId: data.tripId,
        seatId: { in: data.seatIds },
        userId: session.user.id,
        expiresAt: { gte: new Date() },
      },
    });

    if (locks.length !== data.seatIds.length) {
      return NextResponse.json({ error: "Seat reservation expired. Please select seats again." }, { status: 409 });
    }

    const fare = calculateFare(Number(trip.schedule.baseFare), data.seatIds.length);

    // Create booking record in PENDING state
    const booking = await prisma.booking.create({
      data: {
        userId: session.user.id,
        tripId: data.tripId,
        status: "PENDING",
        baseFare: fare.baseFare,
        gstAmount: fare.gstAmount,
        convenienceFee: fare.convenienceFee,
        discount: fare.discount,
        totalAmount: fare.totalAmount,
        passengers: {
          create: data.passengers.map((p) => ({
            name: p.name,
            age: p.age,
            gender: p.gender,
            seatId: p.seatId,
          })),
        },
        seats: {
          create: data.seatIds.map((seatId) => ({ seatId, tripId: data.tripId })),
        },
      },
    });

    // Initiate mock payment
    const payment = await initiatePayment(booking.id, fare.totalAmount, data.method);

    // Create payment record
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: fare.totalAmount,
        method: data.method,
        status: "PENDING",
        gatewayTxnId: payment.gatewayTxnId,
      },
    });

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      paymentId: payment.paymentId,
      amount: fare.totalAmount,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
