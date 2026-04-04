import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMobileSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  try {
    const session = (await auth()) ?? (await getMobileSession(req));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookingId } = await params;

    const booking = await prisma.charterBooking.findUnique({
      where: { id: bookingId, userId: session.user.id },
      include: { payment: true },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status !== "PENDING_DEPOSIT") {
      return NextResponse.json({ error: "Booking already processed" }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.charterPayment.update({
        where: { charterBookingId: bookingId },
        data: {
          status: "SUCCESS",
          gatewayTxnId: `confirmed_${Date.now()}`,
          completedAt: new Date(),
        },
      });

      await tx.charterBooking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED" },
      });
    });

    return NextResponse.json({ success: true, pnr: booking.pnr, bookingId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
