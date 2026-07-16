import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMobileSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const session = (await auth()) ?? (await getMobileSession(req));
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
                bus: {
                  select: {
                    name: true,
                    busType: true,
                    amenities: true,
                    operator: { select: { companyName: true } },
                  },
                },
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

    // Attach the booked segment (boarding/dropping stop) resolved from route stops.
    const stops = booking.trip.schedule.route.stops;
    const boardingStop = booking.boardingStopId ? stops.find((s) => s.id === booking.boardingStopId) ?? null : null;
    const droppingStop = booking.droppingStopId ? stops.find((s) => s.id === booking.droppingStopId) ?? null : null;

    return NextResponse.json({ ...booking, boardingStop, droppingStop });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
