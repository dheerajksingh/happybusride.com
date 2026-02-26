import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = 20;

  const trips = await prisma.trip.findMany({
    where: { schedule: { bus: { operatorId: operator.id } } },
    include: {
      schedule: {
        include: {
          route: { include: { fromCity: true, toCity: true } },
          bus: { select: { name: true, totalSeats: true } },
        },
      },
      driver: { include: { user: { select: { name: true } } } },
      _count: { select: { bookings: true } },
    },
    orderBy: [{ travelDate: "desc" }],
    skip: (page - 1) * limit,
    take: limit,
  });

  const tripIds = trips.map((t) => t.id);
  const bookedCounts = await prisma.bookingsSeat.groupBy({
    by: ["tripId"],
    where: { tripId: { in: tripIds } },
    _count: { seatId: true },
  });
  const bookedByTrip: Record<string, number> = Object.fromEntries(
    bookedCounts.map((b) => [b.tripId, b._count.seatId])
  );

  const tripsWithOccupancy = trips.map((trip) => ({
    ...trip,
    bookedSeats: bookedByTrip[trip.id] ?? 0,
    totalSeats: trip.schedule.bus.totalSeats ?? 0,
    occupancyRate:
      trip.schedule.bus.totalSeats
        ? Math.round(((bookedByTrip[trip.id] ?? 0) / trip.schedule.bus.totalSeats) * 100)
        : 0,
  }));

  return NextResponse.json(tripsWithOccupancy);
}
