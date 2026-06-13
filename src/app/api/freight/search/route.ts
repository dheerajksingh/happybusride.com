import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_CAPACITY_KG   = 500;
const DEFAULT_CAPACITY_CM3  = 1_000_000;
const MAX_LEGS = 5; // max route switches + 1

// ── Inline price calculator (no DB call — config passed in) ───

function calcPrice(
  weightKg: number, volumeCm3: number, distanceKm: number,
  generatedFn: string | null | undefined
): number {
  if (generatedFn) {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("weightKg", "volumeCm3", "distanceKm", generatedFn);
      const price = fn(weightKg, volumeCm3, distanceKm);
      if (typeof price === "number" && price > 0) return Math.round(price);
    } catch {}
  }
  return Math.round(5 * weightKg + 0.002 * volumeCm3 + 0.5 * (distanceKm / 100) * weightKg);
}

// ── BFS path finder across the entire route network ───────────

type PathLeg = { routeId: string; fromCityId: string; toCityId: string };

async function findAllPaths(fromCityId: string, toCityId: string): Promise<PathLeg[][]> {
  // Load entire route network in one query (small table)
  const allStops = await prisma.routeStop.findMany({
    select: { routeId: true, cityId: true, stopOrder: true },
    orderBy: [{ routeId: "asc" }, { stopOrder: "asc" }],
  });

  // Build adjacency: cityId → [{routeId, toCityId}]
  const byRoute = new Map<string, typeof allStops>();
  for (const s of allStops) {
    if (!byRoute.has(s.routeId)) byRoute.set(s.routeId, []);
    byRoute.get(s.routeId)!.push(s);
  }

  const graph = new Map<string, { routeId: string; toCityId: string }[]>();
  for (const [, stops] of byRoute) {
    for (let i = 0; i < stops.length; i++) {
      for (let j = i + 1; j < stops.length; j++) {
        const from = stops[i].cityId;
        const to   = stops[j].cityId;
        if (!graph.has(from)) graph.set(from, []);
        graph.get(from)!.push({ routeId: stops[i].routeId, toCityId: to });
      }
    }
  }

  // BFS
  const allPaths: PathLeg[][] = [];
  type QItem = { cityId: string; path: PathLeg[]; visited: Set<string> };
  const queue: QItem[] = [{ cityId: fromCityId, path: [], visited: new Set([fromCityId]) }];

  while (queue.length > 0) {
    const { cityId, path, visited } = queue.shift()!;
    if (path.length >= MAX_LEGS) continue;

    for (const edge of (graph.get(cityId) ?? [])) {
      if (visited.has(edge.toCityId)) continue;
      const leg: PathLeg = { routeId: edge.routeId, fromCityId: cityId, toCityId: edge.toCityId };
      const newPath = [...path, leg];

      if (edge.toCityId === toCityId) {
        allPaths.push(newPath);
      } else {
        queue.push({ cityId: edge.toCityId, path: newPath, visited: new Set([...visited, edge.toCityId]) });
      }
    }
  }

  return allPaths;
}

// ── Main search ───────────────────────────────────────────────

async function findFreightOptions(
  fromCityId: string,
  toCityId:   string,
  travelDate: Date,
  totalKg:    number,
  totalCm3:   number
) {
  const allPaths = await findAllPaths(fromCityId, toCityId);
  if (!allPaths.length) return [];

  // Batch-fetch all shared data
  const allRouteIds = [...new Set(allPaths.flatMap(p => p.map(l => l.routeId)))];

  const [schedules, pricingConfig, agentConfig, allAgents] = await Promise.all([
    prisma.schedule.findMany({
      where: { routeId: { in: allRouteIds }, isActive: true },
      include: {
        route: {
          include: {
            stops: {
              include: { city: { select: { name: true } } },
              orderBy: { stopOrder: "asc" },
            },
          },
        },
        bus: { select: { name: true } },
        trips: { where: { travelDate } },
      },
    }),
    prisma.freightPricingConfig.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" } }),
    prisma.agentChargeConfig.findFirst({ where: { isActive: true } }),
    prisma.agent.findMany({
      where: { status: "APPROVED" },
      select: { id: true, cityId: true, fullName: true, phone: true },
    }),
  ]);

  const schedByRoute = new Map<string, typeof schedules>();
  for (const s of schedules) {
    if (!schedByRoute.has(s.routeId)) schedByRoute.set(s.routeId, []);
    schedByRoute.get(s.routeId)!.push(s);
  }

  const agentByCity   = new Map(allAgents.map(a => [a.cityId, a]));
  const interimPct    = Number(agentConfig?.agentInterimPct ?? 10) / 100;
  const finalPct      = Number(agentConfig?.agentFinalPct   ?? 5)  / 100;

  // Collect all tripIds across all viable paths for a single capacity batch query
  type ResolvedLeg = { leg: PathLeg; schedule: typeof schedules[0]; trip: typeof schedules[0]["trips"][0] };
  const resolvedPaths: ResolvedLeg[][] = [];

  for (const path of allPaths) {
    const intermediates = path.slice(0, -1).map(l => l.toCityId);
    if (intermediates.some(c => !agentByCity.has(c))) continue; // need agent at each transfer

    const resolved: ResolvedLeg[] = [];
    let valid = true;
    for (const leg of path) {
      const sch = (schedByRoute.get(leg.routeId) ?? []).find(s => s.trips.length > 0);
      if (!sch) { valid = false; break; }
      resolved.push({ leg, schedule: sch, trip: sch.trips[0] });
    }
    if (valid && resolved.length === path.length) resolvedPaths.push(resolved);
  }

  if (!resolvedPaths.length) return [];

  // Batch capacity query — one query for all tripIds
  const allTripIds = [...new Set(resolvedPaths.flatMap(p => p.map(r => r.trip.id)))];
  const usedLegs = await prisma.freightLeg.findMany({
    where: {
      tripId: { in: allTripIds },
      booking: { status: { in: ["CONFIRMED", "IN_TRANSIT", "AT_AGENT", "AT_DESTINATION"] } },
    },
    include: { booking: { include: { items: true } } },
  });

  const usedByTrip = new Map<string, { kg: number; cm3: number }>();
  for (const leg of usedLegs) {
    const cur = usedByTrip.get(leg.tripId!) ?? { kg: 0, cm3: 0 };
    for (const item of leg.booking.items) {
      cur.kg   += Number(item.weightKg);
      cur.cm3  += item.lengthCm * item.breadthCm * item.heightCm;
    }
    usedByTrip.set(leg.tripId!, cur);
  }

  const availCap = (tripId: string) => {
    const used = usedByTrip.get(tripId) ?? { kg: 0, cm3: 0 };
    return {
      kg:  Math.max(0, DEFAULT_CAPACITY_KG  - used.kg),
      cm3: Math.max(0, DEFAULT_CAPACITY_CM3 - used.cm3),
    };
  };

  // Build options
  const options = [];

  for (const resolved of resolvedPaths) {
    let totalDist = 0;
    let valid = true;
    const builtLegs: any[] = [];

    for (const { leg, schedule: sch, trip } of resolved) {
      const cap = availCap(trip.id);
      if (cap.kg < totalKg || cap.cm3 < totalCm3) { valid = false; break; }

      const fromStop = sch.route.stops.find(s => s.cityId === leg.fromCityId)!;
      const toStop   = sch.route.stops.find(s => s.cityId === leg.toCityId)!;
      if (!fromStop || !toStop) { valid = false; break; }

      const routeDist = Number(sch.route.distanceKm ?? 0);
      const segDist   = routeDist > 0
        ? routeDist * (toStop.stopOrder - fromStop.stopOrder) / Math.max(sch.route.stops.length - 1, 1)
        : 0;
      totalDist += segDist;

      builtLegs.push({
        tripId:       trip.id,
        scheduleId:   sch.id,
        busName:      sch.bus.name,
        fromStopId:   fromStop.id,
        fromCityName: fromStop.city.name,
        fromStopName: fromStop.stopName,
        toStopId:     toStop.id,
        toCityName:   toStop.city.name,
        toStopName:   toStop.stopName,
        departureTime: sch.departureTime.toISOString(),
        distanceKm:   Math.round(segDist),
        ...(leg.toCityId === toCityId && agentByCity.has(toCityId)
          ? { destinationAgent: agentByCity.get(toCityId), agentCharge: 0 /* set below */ }
          : {}),
      });
    }

    if (!valid || builtLegs.length === 0) continue;

    const freightCost = calcPrice(totalKg, totalCm3, totalDist, pricingConfig?.generatedFn);
    const intermediates = resolved.slice(0, -1).map(r => r.leg.toCityId);
    const interimCost   = intermediates.length * Math.round(freightCost * interimPct);
    const finalCost     = agentByCity.has(toCityId) ? Math.round(freightCost * finalPct) : 0;
    if (builtLegs[builtLegs.length - 1].destinationAgent) {
      builtLegs[builtLegs.length - 1].agentCharge = finalCost;
    }

    const numTransfers = resolved.length - 1;
    const transfers = intermediates.map(cityId => {
      const a = agentByCity.get(cityId)!;
      const legName = builtLegs.find((l: any) => l.toCityName === a.fullName)?.toCityName
        ?? allAgents.find(ag => ag.cityId === cityId)?.fullName ?? "";
      return {
        cityName:    builtLegs.find((l: any) => l.toStopId && resolved.find(r => r.leg.toCityId === cityId)?.trip)
          ? resolved.find(r => r.leg.toCityId === cityId)!.schedule.route.stops.find((s: any) => s.cityId === cityId)?.city.name ?? ""
          : "",
        agentId:     a.id,
        agentName:   a.fullName,
        agentPhone:  a.phone,
        agentCharge: Math.round(freightCost * interimPct),
      };
    });

    options.push({
      type: numTransfers === 0 ? "DIRECT" as const : `${numTransfers}_HOP`,
      legs: builtLegs,
      transfers,
      freightCost,
      agentCost:   interimCost + finalCost,
      totalCost:   freightCost + interimCost + finalCost,
      availableKg:  Math.min(...resolved.map(r => availCap(r.trip.id).kg)),
      availableCm3: Math.min(...resolved.map(r => availCap(r.trip.id).cm3)),
      ...(agentByCity.has(toCityId) ? { destinationAgent: agentByCity.get(toCityId), finalAgentCharge: finalCost } : {}),
    });
  }

  return options.sort((a, b) => a.totalCost - b.totalCost);
}

// ── GET /api/freight/search ───────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromCityId = searchParams.get("from") ?? "";
  const toCityId   = searchParams.get("to")   ?? "";
  const dateStr    = searchParams.get("date")  ?? "";
  const weightKg   = parseFloat(searchParams.get("weight") ?? "0");
  const lengthCm   = parseInt(searchParams.get("length")   ?? "0");
  const breadthCm  = parseInt(searchParams.get("breadth")  ?? "0");
  const heightCm   = parseInt(searchParams.get("height")   ?? "0");

  if (!fromCityId || !toCityId || !dateStr || !weightKg) {
    return NextResponse.json({ error: "from, to, date and weight are required" }, { status: 400 });
  }

  const travelDate = new Date(dateStr);
  travelDate.setHours(0, 0, 0, 0);
  const volumeCm3 = lengthCm * breadthCm * heightCm;

  const options = await findFreightOptions(fromCityId, toCityId, travelDate, weightKg, volumeCm3);

  if (!options.length) {
    // Find nearest available dates (next 7 days)
    const availableDates: string[] = [];
    for (let d = 1; d <= 7; d++) {
      const nextDate = new Date(travelDate);
      nextDate.setDate(nextDate.getDate() + d);
      const opts = await findFreightOptions(fromCityId, toCityId, nextDate, weightKg, volumeCm3);
      if (opts.length) {
        availableDates.push(nextDate.toISOString().slice(0, 10));
        if (availableDates.length >= 3) break;
      }
    }
    return NextResponse.json({ options: [], availableDates });
  }

  return NextResponse.json({ options });
}
