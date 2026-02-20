import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { confirmPayment } from "@/lib/payment";
import { calculateCommission } from "@/lib/fare";

const schema = z.object({
  bookingId: z.string().min(1),
  paymentId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { bookingId, paymentId } = schema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, userId: session.user.id },
      include: {
        payment: true,
        trip: {
          include: {
            schedule: {
              include: {
                bus: { include: { operator: true } },
              },
            },
          },
        },
      },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status !== "PENDING") return NextResponse.json({ error: "Booking already processed" }, { status: 409 });

    // Mock payment confirmation (always succeeds in dev)
    const { success, gatewayTxnId } = await confirmPayment(paymentId);

    if (!success) {
      await prisma.payment.update({
        where: { bookingId },
        data: { status: "FAILED", completedAt: new Date() },
      });
      await prisma.booking.update({ where: { id: bookingId }, data: { status: "PENDING" } });
      return NextResponse.json({ error: "Payment failed" }, { status: 402 });
    }

    // Confirm booking in a transaction
    await prisma.$transaction(async (tx) => {
      // Update payment
      await tx.payment.update({
        where: { bookingId },
        data: { status: "SUCCESS", gatewayTxnId, completedAt: new Date() },
      });

      // Confirm booking
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED" },
      });

      // Release seat locks for this user on this trip
      await tx.seatLock.deleteMany({
        where: { tripId: booking.tripId, userId: session.user.id },
      });

      // Record operator earning
      const operator = booking.trip.schedule.bus.operator;
      const gross = Number(booking.baseFare);
      const { commissionAmt, gstOnCommission, netPayout } = calculateCommission(gross, operator.commissionRate);

      await tx.operatorEarning.create({
        data: {
          operatorId: operator.id,
          bookingId: booking.id,
          tripDate: booking.trip.travelDate,
          grossAmount: gross,
          commissionRate: operator.commissionRate,
          commissionAmt,
          gstOnCommission,
          netPayout,
        },
      });
    });

    return NextResponse.json({ success: true, pnr: booking.pnr, bookingId });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
