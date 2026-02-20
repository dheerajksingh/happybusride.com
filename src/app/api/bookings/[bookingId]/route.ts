import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookingId } = await params;

    const booking = await prisma.booking.findFirst({
      where: {
        OR: [{ id: bookingId }, { pnr: bookingId }],
        userId: session.user.role === "ADMIN" ? undefined : session.user.id,
      } as any,
      include: {
        trip: {
          include: {
            schedule: {
              include: {
                route: {
                  include: {
                    fromCity: true,
                    toCity: true,
                    stops: { include: { city: true }, orderBy: { stopOrder: "asc" } },
                  },
                },
                bus: { select: { name: true, busType: true, amenities: true } },
              },
            },
            driver: { include: { user: { select: { name: true, phone: true } } } },
          },
        },
        passengers: true,
        seats: { include: { seat: true } },
        payment: true,
        refund: true,
        review: true,
      },
    });

    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    return NextResponse.json(booking);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
