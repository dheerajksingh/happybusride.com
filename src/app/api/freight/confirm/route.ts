import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { confirmPayment } from "@/lib/payment";
import { recordEvent } from "@/lib/outbox";
import { relayNow } from "@/lib/outbox-relay";

const schema = z.object({
  bookingId: z.string().min(1),
  paymentId: z.string().min(1),
});

/**
 * Confirm payment for a passenger freight booking. On success the booking
 * moves PENDING_PAYMENT → CONFIRMED and a `freight.booking.created` outbox
 * event is recorded in the same transaction — the relay then emails every
 * agent assigned to a leg. Agents are therefore only notified once the
 * passenger has paid.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookingId, paymentId } = schema.parse(await req.json());

    const booking = await prisma.freightBooking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.senderId !== session.user.id) {
      return NextResponse.json({ error: "Not your booking" }, { status: 403 });
    }
    if (booking.status !== "PENDING_PAYMENT") {
      return NextResponse.json({ error: "Booking already processed" }, { status: 409 });
    }

    const { success, gatewayTxnId } = await confirmPayment(paymentId);

    if (!success) {
      await prisma.freightPayment.updateMany({
        where: { freightBookingId: bookingId },
        data:  { status: "FAILED", completedAt: new Date() },
      });
      return NextResponse.json({ error: "Payment failed" }, { status: 402 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.freightPayment.updateMany({
        where: { freightBookingId: bookingId },
        data:  { status: "SUCCESS", gatewayTxnId, completedAt: new Date() },
      });

      await tx.freightBooking.update({
        where: { id: bookingId },
        data:  { status: "CONFIRMED" },
      });

      // Outbox event — commits atomically with the confirmation. The relay
      // emails every agent assigned to a leg (origin, transfers, destination).
      await recordEvent(tx, {
        aggregate:   "FreightBooking",
        aggregateId: bookingId,
        type:        "freight.booking.created",
        payload:     { bookingRef: booking.bookingRef },
      });
    });

    // Deliver the agent emails now. Never throws — the booking is already
    // confirmed, so email trouble must not fail the request.
    await relayNow();

    return NextResponse.json({ success: true, bookingRef: booking.bookingRef });
  } catch (err: any) {
    if (err?.issues) return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Confirmation failed" }, { status: 500 });
  }
}
