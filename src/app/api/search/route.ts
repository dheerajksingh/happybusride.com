import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  busType: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sortBy: z.enum(["price_asc", "price_desc", "departure_asc", "rating_desc"]).optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const params = schema.parse(Object.fromEntries(searchParams));

    const travelDate = new Date(params.date);
    const travelDateEnd = new Date(params.date + "T23:59:59");

    const schedules = await prisma.schedule.findMany({
      where: {
        isActive: true,
        route: {
          fromCityId: params.from,
          toCityId: params.to,
          isActive: true,
        },
        ...(params.busType ? { bus: { busType: params.busType as any } } : {}),
        ...(params.minPrice ? { baseFare: { gte: params.minPrice } } : {}),
        ...(params.maxPrice ? { baseFare: { lte: params.maxPrice } } : {}),
      },
      include: {
        route: {
          include: {
            fromCity: { select: { name: true } },
            toCity: { select: { name: true } },
            stops: {
              include: { city: { select: { name: true } } },
              orderBy: { stopOrder: "asc" },
            },
          },
        },
        bus: {
          select: {
            id: true,
            name: true,
            busType: true,
            totalSeats: true,
            amenities: true,
          },
        },
        fareRules: { where: { isActive: true } },
        trips: {
          where: {
            travelDate: { gte: new Date(params.date), lte: travelDateEnd },
          },
          include: {
            _count: { select: { bookings: true } },
            seatLocks: {
              where: { expiresAt: { gte: new Date() } },
              select: { seatId: true },
            },
          },
        },
        _count: {
          select: {
            trips: {
              where: {
                travelDate: { gte: new Date(params.date), lte: travelDateEnd },
              },
            },
          },
        },
      },
      orderBy:
        params.sortBy === "price_desc"
          ? { baseFare: "desc" }
          : params.sortBy === "departure_asc"
          ? { departureTime: "asc" }
          : { baseFare: "asc" },
    });

    // Enrich with available seat count
    const results = schedules.map((schedule) => {
      const trip = schedule.trips[0];
      const bookedSeats = trip?._count?.bookings ?? 0;
      const lockedSeats = trip?.seatLocks?.length ?? 0;
      const availableSeats = schedule.bus.totalSeats - bookedSeats - lockedSeats;

      return {
        scheduleId: schedule.id,
        tripId: trip?.id ?? null,
        route: {
          from: schedule.route.fromCity.name,
          to: schedule.route.toCity.name,
          stops: schedule.route.stops,
          durationMins: schedule.route.durationMins,
          distanceKm: schedule.route.distanceKm,
        },
        bus: schedule.bus,
        departureTime: schedule.departureTime,
        arrivalTime: schedule.arrivalTime,
        baseFare: schedule.baseFare,
        fareRules: schedule.fareRules,
        availableSeats: Math.max(0, availableSeats),
        totalSeats: schedule.bus.totalSeats,
      };
    });

    return NextResponse.json({ results, total: results.length });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
