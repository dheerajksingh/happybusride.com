import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getMobileSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  reason: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  try {
    const session = (await auth()) ?? (await getMobileSession(req));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookingId } = await params;
    const body = await req.json();
    const { reason } = schema.parse(body);

    const booking = await prisma.charterBooking.findUnique({
      where: { id: bookingId, userId: session.user.id },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status === "CANCELLED_PASSENGER" || booking.status === "CANCELLED_OPERATOR") {
      return NextResponse.json({ error: "Booking already cancelled" }, { status: 409 });
    }
    if (booking.status === "COMPLETED") {
      return NextResponse.json({ error: "Cannot cancel a completed booking" }, { status: 409 });
    }

    await prisma.charterBooking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED_PASSENGER",
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
