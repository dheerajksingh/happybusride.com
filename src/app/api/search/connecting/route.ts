import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const params = schema.parse(Object.fromEntries(searchParams));

    const travelDate = new Date(params.date);
    travelDate.setHours(0, 0, 0, 0);
    const travelDateEnd = new Date(params.date + "T23:59:59");

    // Find all route stops for source city (leg 1 starts here)
    const fromStops = await prisma.routeStop.findMany({
      where: { cityId: params.from },
      select: { routeId: true, stopOrder: true },
    });

    // Find all route stops for destination city (leg 2 ends here)
    const toStops = await prisma.routeStop.findMany({
      where: { cityId: params.to },
      select: { routeId: true, stopOrder: true },
    });

    if (!fromStops.length || !toStops.length) {
      return NextResponse.json({ options: [] });
    }

    // Find all cities reachable from fromCity
    const fromRouteIds = fromStops.map(s => s.routeId);
    const stopsAfterFrom = await prisma.routeStop.findMany({
      where: { routeId: { in: fromRouteIds } },
      select: { routeId: true, stopOrder: true, cityId: true },
    });
    const fromOrderMap = new Map(fromStops.map(s => [s.routeId, s.stopOrder]));
    const reachableFromFrom = new Map<string, { routeId: string; stopOrder: number }[]>();
    for (const s of stopsAfterFrom) {
      if (s.cityId === params.from || s.cityId === params.to) continue;
      const fromOrder = fromOrderMap.get(s.routeId) ?? 999;
      if (s.stopOrder <= fromOrder) continue;
      if (!reachableFromFrom.has(s.cityId)) reachableFromFrom.set(s.cityId, []);
      reachableFromFrom.get(s.cityId)!.push({ routeId: s.routeId, stopOrder: s.stopOrder });
    }

    // Find all cities that can reach toCity
    const toRouteIds = toStops.map(s => s.routeId);
    const stopsBeforeTo = await prisma.routeStop.findMany({
      where: { routeId: { in: toRouteIds } },
      select: { routeId: true, stopOrder: true, cityId: true },
    });
    const toOrderMap = new Map(toStops.map(s => [s.routeId, s.stopOrder]));
    const canReachTo = new Map<string, { routeId: string; stopOrder: number }[]>();
    for (const s of stopsBeforeTo) {
      if (s.cityId === params.from || s.cityId === params.to) continue;
      const toOrder = toOrderMap.get(s.routeId) ?? 0;
      if (s.stopOrder >= toOrder) continue;
      if (!canReachTo.has(s.cityId)) canReachTo.set(s.cityId, []);
      canReachTo.get(s.cityId)!.push({ routeId: s.routeId, stopOrder: s.stopOrder });
    }

    // Intersection: cities that appear in both sets
    const intermediateCityIds = [...reachableFromFrom.keys()].filter(id => canReachTo.has(id));
    if (!intermediateCityIds.length) return NextResponse.json({ options: [] });

    const intermediaryCities = await prisma.city.findMany({
      where: { id: { in: intermediateCityIds } },
      select: { id: true, name: true },
    });
    const cityNameMap = new Map(intermediaryCities.map(c => [c.id, c.name]));

    const options: any[] = [];

    for (const midCityId of intermediateCityIds) {
      const leg1RouteIds = reachableFromFrom.get(midCityId)!.map(s => s.routeId);
      const leg2RouteIds = canReachTo.get(midCityId)!.map(s => s.routeId);

      const [leg1Schedules, leg2Schedules] = await Promise.all([
        prisma.schedule.findMany({
          where: { routeId: { in: leg1RouteIds }, isActive: true, route: { isActive: true, operator: { status: "APPROVED" } } },
          include: {
            route: {
              include: {
                fromCity: { select: { name: true } },
                toCity: { select: { name: true } },
                stops: { orderBy: { stopOrder: "asc" } },
              },
            },
            bus: { select: { name: true, busType: true, totalSeats: true } },
            trips: {
              where: { travelDate: { gte: travelDate, lte: travelDateEnd } },
              include: { _count: { select: { bookings: true } }, seatLocks: { where: { expiresAt: { gte: new Date() } } } },
            },
          },
          take: 3,
        }),
        prisma.schedule.findMany({
          where: { routeId: { in: leg2RouteIds }, isActive: true, route: { isActive: true, operator: { status: "APPROVED" } } },
          include: {
            route: {
              include: {
                fromCity: { select: { name: true } },
                toCity: { select: { name: true } },
                stops: { orderBy: { stopOrder: "asc" } },
              },
            },
            bus: { select: { name: true, busType: true, totalSeats: true } },
            trips: {
              where: { travelDate: { gte: travelDate, lte: travelDateEnd } },
              include: { _count: { select: { bookings: true } }, seatLocks: { where: { expiresAt: { gte: new Date() } } } },
            },
          },
          take: 3,
        }),
      ]);

      for (const sch1 of leg1Schedules) {
        for (const sch2 of leg2Schedules) {
          const trip1 = sch1.trips[0];
          const trip2 = sch2.trips[0];
          if (!trip1 || !trip2) continue;

          // Check timing: leg1 must arrive at mid before leg2 departs from mid
          const midStop1 = sch1.route.stops.find(s => s.cityId === midCityId);
          const midStop2 = sch2.route.stops.find(s => s.cityId === midCityId);
          if (!midStop1 || !midStop2) continue;

          const leg1ArrivalOffset = midStop1.arrivalOffset ?? 0;
          const leg2DepartureOffset = midStop2.departureOffset ?? 0;

          const sch1Dep = new Date(sch1.departureTime);
          const sch2Dep = new Date(sch2.departureTime);
          const leg1ArrivalMins = sch1Dep.getHours() * 60 + sch1Dep.getMinutes() + leg1ArrivalOffset;
          const leg2DepartureMins = sch2Dep.getHours() * 60 + sch2Dep.getMinutes() + leg2DepartureOffset;

          if (leg2DepartureMins <= leg1ArrivalMins) continue; // leg2 departs before leg1 arrives

          const avail1 = Math.max(0, sch1.bus.totalSeats - (trip1._count?.bookings ?? 0) - (trip1.seatLocks?.length ?? 0));
          const avail2 = Math.max(0, sch2.bus.totalSeats - (trip2._count?.bookings ?? 0) - (trip2.seatLocks?.length ?? 0));

          if (avail1 === 0 || avail2 === 0) continue;

          options.push({
            transferCity: cityNameMap.get(midCityId) ?? midCityId,
            transferCityId: midCityId,
            leg1: {
              scheduleId: sch1.id,
              tripId: trip1.id,
              busName: sch1.bus.name,
              busType: sch1.bus.busType,
              fromCity: sch1.route.fromCity.name,
              toCity: cityNameMap.get(midCityId) ?? midCityId,
              departureTime: sch1.departureTime,
              arrivalTime: sch1.arrivalTime,
              baseFare: sch1.baseFare,
              availableSeats: avail1,
            },
            leg2: {
              scheduleId: sch2.id,
              tripId: trip2.id,
              busName: sch2.bus.name,
              busType: sch2.bus.busType,
              fromCity: cityNameMap.get(midCityId) ?? midCityId,
              toCity: sch2.route.toCity.name,
              departureTime: sch2.departureTime,
              arrivalTime: sch2.arrivalTime,
              baseFare: sch2.baseFare,
              availableSeats: avail2,
            },
            totalFare: Number(sch1.baseFare) + Number(sch2.baseFare),
          });
        }
      }
    }

    return NextResponse.json({ options: options.slice(0, 20) });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
