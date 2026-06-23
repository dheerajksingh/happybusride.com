import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMobileSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = (await auth()) ?? (await getMobileSession(req));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = 10;
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: { userId: session.user.id },
        include: {
          trip: {
            include: {
              schedule: {
                include: {
                  route: {
                    include: {
                      fromCity: { select: { name: true } },
                      toCity: { select: { name: true } },
                      stops: {
                        select: { id: true, stopName: true, city: { select: { name: true } } },
                        orderBy: { stopOrder: "asc" },
                      },
                    },
                  },
                  bus: { select: { name: true, busType: true } },
                },
              },
            },
          },
          seats: { include: { seat: { select: { seatNumber: true } } } },
          payment: { select: { status: true, method: true } },
          connectingGroup: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where: { userId: session.user.id } }),
    ]);

    // Attach the booked segment (boarding/dropping stop) resolved from route stops.
    const withSegment = bookings.map((b) => {
      const stops = b.trip.schedule.route.stops;
      return {
        ...b,
        boardingStop: b.boardingStopId ? stops.find((s) => s.id === b.boardingStopId) ?? null : null,
        droppingStop: b.droppingStopId ? stops.find((s) => s.id === b.droppingStopId) ?? null : null,
      };
    });

    return NextResponse.json({ bookings: withSegment, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
