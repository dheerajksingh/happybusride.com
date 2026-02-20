import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateRefundAmount } from "@/lib/fare";

const schema = z.object({ reason: z.string().optional() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookingId } = await params;
    const body = await req.json().catch(() => ({}));
    const { reason } = schema.parse(body);

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, userId: session.user.id },
      include: {
        trip: {
          include: {
            schedule: {
              include: { bus: { include: { operator: true } } },
            },
          },
        },
        payment: true,
      },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status !== "CONFIRMED") {
      return NextResponse.json({ error: "Only confirmed bookings can be cancelled" }, { status: 400 });
    }

    const policy = booking.trip.schedule.bus.operator.cancellationPolicy;
    const departureTime = booking.trip.schedule.departureTime;
    const totalPaid = Number(booking.totalAmount);
    const refundAmount = calculateRefundAmount(totalPaid, departureTime, policy);

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED_USER",
          cancelledAt: new Date(),
          cancellationReason: reason ?? "Cancelled by user",
        },
      });

      await tx.refund.create({
        data: {
          bookingId,
          requestedBy: session.user.id,
          amount: refundAmount,
          reason: reason ?? "Passenger cancellation",
          status: refundAmount > 0 ? "REQUESTED" : "REJECTED",
        },
      });

      // Free up the seats (BookingsSeat records stay but booking is cancelled)
    });

    return NextResponse.json({
      success: true,
      refundAmount,
      message: refundAmount > 0 ? `Refund of ₹${refundAmount} will be processed within 5-7 days` : "No refund applicable per cancellation policy",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
