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

    // Step 1: self-join on route_stops — single query to find routes where
    // fromCity stop appears before toCity stop on the same route
    const validRoutes = await prisma.$queryRaw<{ routeId: string }[]>`
      SELECT rs1."routeId"
      FROM route_stops rs1
      JOIN route_stops rs2 ON rs1."routeId" = rs2."routeId"
      WHERE rs1."cityId" = ${params.from}
        AND rs2."cityId" = ${params.to}
        AND rs1."stopOrder" < rs2."stopOrder"
    `;

    const validRouteIds = validRoutes.map((r) => r.routeId);

    if (!validRouteIds.length) {
      return NextResponse.json({ results: [], total: 0 });
    }

    // Step 3: find active schedules on those routes with approved operator
    const schedules = await prisma.schedule.findMany({
      where: {
        isActive: true,
        route: { id: { in: validRouteIds }, isActive: true },
        bus: {
          charterOnly: false,
          operator: { status: "APPROVED" },
          ...(params.busType ? { busType: params.busType as any } : {}),
        },
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
        fareRules: {
          where: { isActive: true },
          include: { fromStop: true, toStop: true },
        },
        trips: {
          where: {
            travelDate: { gte: travelDate, lte: travelDateEnd },
          },
          include: {
            _count: { select: { bookings: true } },
            seatLocks: {
              where: { expiresAt: { gte: new Date() } },
              select: { seatId: true },
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

    // Step 4: enrich with boarding/alighting stop info, segment distance, and proportional fare
    const results = schedules.map((schedule) => {
      const trip = schedule.trips[0];
      const bookedSeats = trip?._count?.bookings ?? 0;
      const lockedSeats = trip?.seatLocks?.length ?? 0;
      const availableSeats = schedule.bus.totalSeats - bookedSeats - lockedSeats;

      const stops = schedule.route.stops;
      const boardingStop  = stops.find((s) => s.cityId === params.from);
      const alightingStop = stops.find((s) => s.cityId === params.to);

      const totalDistance = schedule.route.distanceKm ?? 0;

      // Segment distance — use stored cumulative distances if available, else fall back to stop-order proportion
      const fromDist = boardingStop?.distanceFromOriginKm ?? null;
      const toDist   = alightingStop?.distanceFromOriginKm ?? null;
      const segmentDistance = (fromDist !== null && toDist !== null)
        ? toDist - fromDist
        : (() => {
            const totalStops = stops.length;
            const fromOrder  = boardingStop?.stopOrder  ?? 1;
            const toOrder    = alightingStop?.stopOrder ?? totalStops;
            return totalStops > 1
              ? Math.round(totalDistance * (toOrder - fromOrder) / (totalStops - 1))
              : totalDistance;
          })();

      // Fare — check for an exact stop-pair fare rule first, else proportional
      const exactRule = schedule.fareRules.find(
        (r) => r.fromStop?.cityId === params.from && r.toStop?.cityId === params.to
      );
      const baseFare = Number(schedule.baseFare);
      const segmentFare = exactRule
        ? Number(exactRule.price)
        : totalDistance > 0
          ? Math.round(baseFare * segmentDistance / totalDistance)
          : baseFare;

      // Adjust times to boarding/alighting stop offsets
      const boardingOffset  = boardingStop?.departureOffset ?? 0;
      const alightingOffset = alightingStop?.arrivalOffset  ?? 0;
      const boardingTime  = new Date(schedule.departureTime);
      boardingTime.setMinutes(boardingTime.getMinutes() + boardingOffset);
      const alightingTime = new Date(schedule.departureTime);
      alightingTime.setMinutes(alightingTime.getMinutes() + alightingOffset);
      const segmentDurationMins = alightingOffset - boardingOffset;

      return {
        scheduleId: schedule.id,
        tripId: trip?.id ?? null,
        route: {
          from: boardingStop?.city?.name ?? schedule.route.fromCity.name,
          to: alightingStop?.city?.name ?? schedule.route.toCity.name,
          fromStopName: boardingStop?.stopName ?? null,
          toStopName: alightingStop?.stopName ?? null,
          stops,
          durationMins: segmentDurationMins > 0 ? segmentDurationMins : (schedule.route.durationMins ?? null),
          distanceKm: segmentDistance,        // segment distance for display
          fullRouteDistanceKm: totalDistance, // full route distance for reference
        },
        bus: schedule.bus,
        departureTime: boardingTime.toISOString(),   // time at boarding stop
        arrivalTime: alightingTime.toISOString(),     // time at alighting stop
        baseFare: segmentFare,
        fullRouteFare: baseFare,
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
