import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMobileSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  try {
    const session = (await auth()) ?? (await getMobileSession(req));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookingId } = await params;

    const booking = await prisma.charterBooking.findUnique({
      where: { id: bookingId, userId: session.user.id },
      include: {
        bus: {
          select: {
            id: true,
            name: true,
            busType: true,
            totalSeats: true,
            amenities: true,
            imageUrls: true,
            operator: {
              select: { companyName: true, cancellationPolicy: true },
            },
          },
        },
        payment: true,
      },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    return NextResponse.json({ booking });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
