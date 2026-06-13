import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const MIN_CONNECTION_MINS = 20;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params = schema.parse(Object.fromEntries(searchParams));

    const travelDate = new Date(params.date);
    travelDate.setHours(0, 0, 0, 0);
    const travelDateEnd = new Date(params.date + "T23:59:59");

    // Stops for origin and destination cities
    const [fromStops, toStops] = await Promise.all([
      prisma.routeStop.findMany({ where: { cityId: params.from }, select: { routeId: true, stopOrder: true } }),
      prisma.routeStop.findMany({ where: { cityId: params.to }, select: { routeId: true, stopOrder: true } }),
    ]);
    if (!fromStops.length || !toStops.length) return NextResponse.json({ options: [] });

    // Cities reachable from origin (stops that come AFTER origin on the same route)
    const fromRouteIds = fromStops.map(s => s.routeId);
    const fromOrderMap = new Map(fromStops.map(s => [s.routeId, s.stopOrder]));
    const stopsAfterFrom = await prisma.routeStop.findMany({
      where: { routeId: { in: fromRouteIds } },
      select: { routeId: true, stopOrder: true, cityId: true },
    });
    const reachableFromFrom = new Map<string, string[]>(); // cityId → routeIds
    for (const s of stopsAfterFrom) {
      if (s.cityId === params.from || s.cityId === params.to) continue;
      if (s.stopOrder <= (fromOrderMap.get(s.routeId) ?? 999)) continue;
      if (!reachableFromFrom.has(s.cityId)) reachableFromFrom.set(s.cityId, []);
      reachableFromFrom.get(s.cityId)!.push(s.routeId);
    }

    // Cities that can reach destination (stops that come BEFORE destination on the same route)
    const toRouteIds = toStops.map(s => s.routeId);
    const toOrderMap = new Map(toStops.map(s => [s.routeId, s.stopOrder]));
    const stopsBeforeTo = await prisma.routeStop.findMany({
      where: { routeId: { in: toRouteIds } },
      select: { routeId: true, stopOrder: true, cityId: true },
    });
    const canReachTo = new Map<string, string[]>(); // cityId → routeIds
    for (const s of stopsBeforeTo) {
      if (s.cityId === params.from || s.cityId === params.to) continue;
      if (s.stopOrder >= (toOrderMap.get(s.routeId) ?? 0)) continue;
      if (!canReachTo.has(s.cityId)) canReachTo.set(s.cityId, []);
      canReachTo.get(s.cityId)!.push(s.routeId);
    }

    // Transfer cities = intersection of reachable and can-reach sets
    const transferCityIds = [...reachableFromFrom.keys()].filter(id => canReachTo.has(id));
    if (!transferCityIds.length) return NextResponse.json({ options: [] });

    // Fetch city names for origin, destination, and all transfer cities
    const cities = await prisma.city.findMany({
      where: { id: { in: [params.from, params.to, ...transferCityIds] } },
      select: { id: true, name: true },
    });
    const cityNameMap = new Map(cities.map(c => [c.id, c.name]));

    // Anchors a schedule's stop time to the actual travel date using only time-of-day from departureTime.
    // Handles overnight (offset > 1440 mins) by advancing the date.
    const stopTime = (schedDep: Date, offsetMins: number): Date => {
      const baseMins = schedDep.getUTCHours() * 60 + schedDep.getUTCMinutes() + offsetMins;
      const dt = new Date(params.date + "T00:00:00Z");
      dt.setUTCDate(dt.getUTCDate() + Math.floor(baseMins / 1440));
      dt.setUTCHours(0, baseMins % 1440, 0, 0);
      return dt;
    };

    const options: any[] = [];

    for (const midCityId of transferCityIds) {
      const leg1RouteIds = [...new Set(reachableFromFrom.get(midCityId)!)];
      const leg2RouteIds = [...new Set(canReachTo.get(midCityId)!)];

      const [leg1Schedules, leg2Schedules] = await Promise.all([
        prisma.schedule.findMany({
          where: {
            routeId: { in: leg1RouteIds },
            isActive: true,
            route: { isActive: true },
            bus: { charterOnly: false, operator: { status: "APPROVED" } },
          },
          include: {
            route: { select: { distanceKm: true, stops: { orderBy: { stopOrder: "asc" } } } },
            bus: { select: { name: true, busType: true, totalSeats: true } },
            trips: {
              where: { travelDate: { gte: travelDate, lte: travelDateEnd } },
              include: {
                _count: { select: { bookings: true } },
                seatLocks: { where: { expiresAt: { gte: new Date() } }, select: { seatId: true } },
              },
            },
          },
          take: 5,
        }),
        prisma.schedule.findMany({
          where: {
            routeId: { in: leg2RouteIds },
            isActive: true,
            route: { isActive: true },
            bus: { charterOnly: false, operator: { status: "APPROVED" } },
          },
          include: {
            route: { select: { distanceKm: true, stops: { orderBy: { stopOrder: "asc" } } } },
            bus: { select: { name: true, busType: true, totalSeats: true } },
            trips: {
              where: { travelDate: { gte: travelDate, lte: travelDateEnd } },
              include: {
                _count: { select: { bookings: true } },
                seatLocks: { where: { expiresAt: { gte: new Date() } }, select: { seatId: true } },
              },
            },
          },
          take: 5,
        }),
      ]);

      for (const sch1 of leg1Schedules) {
        for (const sch2 of leg2Schedules) {
          const trip1 = sch1.trips[0];
          const trip2 = sch2.trips[0];
          if (!trip1 || !trip2) continue;

          const boardingStop  = sch1.route.stops.find(s => s.cityId === params.from);
          const midStop1      = sch1.route.stops.find(s => s.cityId === midCityId);
          const midStop2      = sch2.route.stops.find(s => s.cityId === midCityId);
          const alightingStop = sch2.route.stops.find(s => s.cityId === params.to);
          if (!midStop1 || !midStop2) continue;

          const sch1Dep = new Date(sch1.departureTime);
          const sch2Dep = new Date(sch2.departureTime);
          const leg1DepTime  = stopTime(sch1Dep, boardingStop?.departureOffset ?? 0);
          const leg1ArrTime  = stopTime(sch1Dep, midStop1.arrivalOffset ?? 0);
          const leg2DepTime  = stopTime(sch2Dep, midStop2.departureOffset ?? 0);
          const leg2ArrTime  = stopTime(sch2Dep, alightingStop?.arrivalOffset ?? 0);

          // Must have at least MIN_CONNECTION_MINS gap at transfer city
          const waitMins = Math.round((leg2DepTime.getTime() - leg1ArrTime.getTime()) / 60000);
          if (waitMins < MIN_CONNECTION_MINS) continue;

          const avail1 = Math.max(0, sch1.bus.totalSeats - (trip1._count?.bookings ?? 0) - (trip1.seatLocks?.length ?? 0));
          const avail2 = Math.max(0, sch2.bus.totalSeats - (trip2._count?.bookings ?? 0) - (trip2.seatLocks?.length ?? 0));
          if (avail1 === 0 || avail2 === 0) continue;

          // Proportional segment fares based on distanceFromOriginKm when available
          const totalDist1 = sch1.route.distanceKm ?? 0;
          const fromDist1  = boardingStop?.distanceFromOriginKm ?? null;
          const midDist1   = midStop1.distanceFromOriginKm ?? null;
          const segDist1   = fromDist1 !== null && midDist1 !== null ? midDist1 - fromDist1 : null;
          const leg1Fare   = segDist1 !== null && totalDist1 > 0
            ? Math.round(Number(sch1.baseFare) * segDist1 / totalDist1)
            : Number(sch1.baseFare);

          const totalDist2 = sch2.route.distanceKm ?? 0;
          const midDist2   = midStop2.distanceFromOriginKm ?? null;
          const toDist2    = alightingStop?.distanceFromOriginKm ?? null;
          const segDist2   = midDist2 !== null && toDist2 !== null ? toDist2 - midDist2 : null;
          const leg2Fare   = segDist2 !== null && totalDist2 > 0
            ? Math.round(Number(sch2.baseFare) * segDist2 / totalDist2)
            : Number(sch2.baseFare);

          options.push({
            transferCity: cityNameMap.get(midCityId) ?? midCityId,
            transferCityId: midCityId,
            transferWaitMins: waitMins,
            leg1: {
              scheduleId: sch1.id,
              tripId: trip1.id,
              busName: sch1.bus.name,
              busType: sch1.bus.busType,
              fromCity: cityNameMap.get(params.from) ?? params.from,
              toCity: cityNameMap.get(midCityId) ?? midCityId,
              departureTime: leg1DepTime.toISOString(),
              arrivalTime: leg1ArrTime.toISOString(),
              baseFare: leg1Fare,
              availableSeats: avail1,
            },
            leg2: {
              scheduleId: sch2.id,
              tripId: trip2.id,
              busName: sch2.bus.name,
              busType: sch2.bus.busType,
              fromCity: cityNameMap.get(midCityId) ?? midCityId,
              toCity: cityNameMap.get(params.to) ?? params.to,
              departureTime: leg2DepTime.toISOString(),
              arrivalTime: leg2ArrTime.toISOString(),
              baseFare: leg2Fare,
              availableSeats: avail2,
            },
            totalFare: leg1Fare + leg2Fare,
          });
        }
      }
    }

    options.sort((a, b) => a.totalFare - b.totalFare);

    return NextResponse.json({ options: options.slice(0, 20) });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
