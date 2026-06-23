import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { resolveSegment, segmentDistanceKm, segmentFare, occupantInterval, segmentsOverlap, bookingInterval } from "@/lib/segment";

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
            seatLocks: {
              where: { expiresAt: { gte: new Date() } },
              select: { seatId: true, boardingStopId: true, droppingStopId: true },
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

    // Segment-aware occupancy: booked seats (with their segments) for the result trips.
    const tripIds = schedules.map((s) => s.trips[0]?.id).filter(Boolean) as string[];
    const bookedSeatRows = tripIds.length
      ? await prisma.bookingsSeat.findMany({
          where: {
            tripId: { in: tripIds },
            booking: { status: { notIn: ["CANCELLED_USER", "CANCELLED_OPERATOR", "REFUNDED"] } },
          },
          select: {
            tripId: true,
            seatId: true,
            booking: { select: { boardingStopId: true, droppingStopId: true, boardingStopOrder: true, droppingStopOrder: true } },
          },
        })
      : [];
    type BookedSeat = (typeof bookedSeatRows)[number];
    const bookedByTrip = new Map<string, BookedSeat[]>();
    for (const r of bookedSeatRows) {
      const arr = bookedByTrip.get(r.tripId) ?? [];
      arr.push(r);
      bookedByTrip.set(r.tripId, arr);
    }

    // Step 4: enrich with boarding/alighting stop info, segment distance, and proportional fare
    const results = schedules.map((schedule) => {
      const trip = schedule.trips[0];
      const stops = schedule.route.stops;
      const totalDistance = schedule.route.distanceKm ?? 0;
      const baseFare = Number(schedule.baseFare);

      // Resolve the segment + its fare/distance via the shared helper, so the
      // price shown here matches what the seat page and payment charge.
      const seg = resolveSegment(stops, { fromCityId: params.from, toCityId: params.to });
      const boardingStop  = stops.find((s) => s.id === seg.boardingStop.id);
      const alightingStop = stops.find((s) => s.id === seg.droppingStop.id);
      const segmentDistance = Math.round(segmentDistanceKm(totalDistance, stops, seg));
      const segmentFareValue = segmentFare(baseFare, totalDistance, stops, seg, schedule.fareRules);

      // Count DISTINCT seats whose booking or active lock overlaps the searched segment.
      const occupied = new Set<string>();
      if (trip) {
        for (const bk of bookedByTrip.get(trip.id) ?? []) {
          const iv = bookingInterval(stops, bk.booking);
          if (segmentsOverlap(seg.boardingOrder, seg.droppingOrder, iv.board, iv.drop)) occupied.add(bk.seatId);
        }
        for (const lk of trip.seatLocks) {
          const iv = occupantInterval(stops, lk.boardingStopId, lk.droppingStopId);
          if (segmentsOverlap(seg.boardingOrder, seg.droppingOrder, iv.board, iv.drop)) occupied.add(lk.seatId);
        }
      }
      const availableSeats = Math.max(0, schedule.bus.totalSeats - occupied.size);

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
        baseFare: segmentFareValue,
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
