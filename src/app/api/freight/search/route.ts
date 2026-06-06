import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Default cargo capacity per bus (kg, cm³)
const DEFAULT_CAPACITY_KG = 500;
const DEFAULT_CAPACITY_CM3 = 1_000_000; // 1000 litres

// ── Price calculator ──────────────────────────────────────────

async function calcFreightPrice(weightKg: number, volumeCm3: number, distanceKm: number): Promise<number> {
  const config = await prisma.freightPricingConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (config?.generatedFn) {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("weightKg", "volumeCm3", "distanceKm", config.generatedFn);
      const price = fn(weightKg, volumeCm3, distanceKm);
      if (typeof price === "number" && price > 0) return Math.round(price);
    } catch {
      // fall through to default
    }
  }

  // Default formula: ₹5/kg + ₹0.002/cm³ + ₹0.5/km/100kg
  return Math.round(5 * weightKg + 0.002 * volumeCm3 + 0.5 * (distanceKm / 100) * weightKg);
}

// ── Cargo space check ─────────────────────────────────────────

async function getAvailableCapacity(tripId: string): Promise<{ kg: number; cm3: number }> {
  const usedLegs = await prisma.freightLeg.findMany({
    where: {
      tripId,
      booking: { status: { in: ["CONFIRMED", "IN_TRANSIT", "AT_AGENT", "AT_DESTINATION"] } },
    },
    include: { booking: { include: { items: true } } },
  });

  let usedKg = 0, usedCm3 = 0;
  for (const leg of usedLegs) {
    for (const item of leg.booking.items) {
      usedKg += Number(item.weightKg);
      usedCm3 += item.lengthCm * item.breadthCm * item.heightCm;
    }
  }

  return {
    kg: Math.max(0, DEFAULT_CAPACITY_KG - usedKg),
    cm3: Math.max(0, DEFAULT_CAPACITY_CM3 - usedCm3),
  };
}

// ── Route finding ─────────────────────────────────────────────

async function findDirectOptions(
  fromCityId: string,
  toCityId: string,
  travelDate: Date,
  totalKg: number,
  totalCm3: number
) {
  // Find routes where both cities appear as stops, in order
  const fromStops = await prisma.routeStop.findMany({ where: { cityId: fromCityId }, select: { routeId: true, stopOrder: true } });
  const toStops   = await prisma.routeStop.findMany({ where: { cityId: toCityId },   select: { routeId: true, stopOrder: true } });

  const fromMap = new Map(fromStops.map(s => [s.routeId, s.stopOrder]));
  const directRouteIds = toStops
    .filter(s => fromMap.has(s.routeId) && fromMap.get(s.routeId)! < s.stopOrder)
    .map(s => s.routeId);

  if (!directRouteIds.length) return [];

  const schedules = await prisma.schedule.findMany({
    where: { routeId: { in: directRouteIds }, isActive: true },
    include: {
      route: {
        include: {
          fromCity: { select: { name: true } },
          toCity:   { select: { name: true } },
          stops: { include: { city: { select: { name: true } } }, orderBy: { stopOrder: "asc" } },
        },
      },
      bus: { select: { name: true, busType: true } },
      trips: { where: { travelDate } },
    },
  });

  const agentConfig = await prisma.agentChargeConfig.findFirst({ where: { isActive: true } });
  const finalPct = Number(agentConfig?.agentFinalPct ?? 5) / 100;

  const destAgent = await prisma.agent.findFirst({
    where: { cityId: toCityId, status: "APPROVED" },
    select: { id: true, fullName: true, phone: true },
  });

  const options = [];
  for (const sch of schedules) {
    const trip = sch.trips[0];
    if (!trip) continue;

    const cap = await getAvailableCapacity(trip.id);
    if (cap.kg < totalKg || cap.cm3 < totalCm3) continue;

    const fromStop = sch.route.stops.find(s => s.cityId === fromCityId)!;
    const toStop   = sch.route.stops.find(s => s.cityId === toCityId)!;
    const depTime  = new Date(sch.departureTime);
    depTime.setMinutes(depTime.getMinutes() + (fromStop.departureOffset ?? 0));

    // Estimate distance proportionally
    const routeDist = sch.route.distanceKm ?? 0;
    const fromOrd = fromStop.stopOrder, toOrd = toStop.stopOrder;
    const totalStops = sch.route.stops.length;
    const distKm = Number(routeDist) * (toOrd - fromOrd) / Math.max(totalStops - 1, 1);

    const price = await calcFreightPrice(totalKg, totalCm3, distKm);
    const finalAgentCharge = destAgent ? Math.round(price * finalPct) : 0;

    const lastLeg: any = {
      tripId:       trip.id,
      scheduleId:   sch.id,
      busName:      sch.bus.name,
      fromStopId:   fromStop.id,
      fromCityName: fromStop.city.name,
      fromStopName: fromStop.stopName,
      toStopId:     toStop.id,
      toCityName:   toStop.city.name,
      toStopName:   toStop.stopName,
      departureTime: depTime.toISOString(),
      distanceKm:   Math.round(distKm),
    };

    if (destAgent) {
      lastLeg.destinationAgent = {
        agentId:    destAgent.id,
        agentName:  destAgent.fullName,
        agentPhone: destAgent.phone,
      };
      lastLeg.agentCharge = finalAgentCharge;
    }

    options.push({
      type: "DIRECT" as const,
      legs: [lastLeg],
      transfers: [],
      freightCost: price,
      agentCost:   finalAgentCharge,
      totalCost:   price + finalAgentCharge,
      availableKg:  cap.kg,
      availableCm3: cap.cm3,
      ...(destAgent ? {
        destinationAgent: {
          agentId:    destAgent.id,
          agentName:  destAgent.fullName,
          agentPhone: destAgent.phone,
        },
        finalAgentCharge,
      } : {}),
    });
  }
  return options;
}

async function findOneHopOptions(
  fromCityId: string,
  toCityId:   string,
  travelDate: Date,
  totalKg:    number,
  totalCm3:   number
) {
  // Find all cities reachable from fromCity that can also reach toCity
  // AND have at least one approved agent (needed for interim handling)
  const fromStops = await prisma.routeStop.findMany({
    where: { cityId: fromCityId },
    select: { routeId: true, stopOrder: true, cityId: true },
  });
  const toStops = await prisma.routeStop.findMany({
    where: { cityId: toCityId },
    select: { routeId: true, stopOrder: true, cityId: true },
  });

  // Stops reachable from fromCity
  const reachableFromFrom = await prisma.routeStop.findMany({
    where: { routeId: { in: fromStops.map(s => s.routeId) } },
    select: { routeId: true, stopOrder: true, cityId: true },
  });

  // Stops that can reach toCity
  const canReachTo = await prisma.routeStop.findMany({
    where: { routeId: { in: toStops.map(s => s.routeId) } },
    select: { routeId: true, stopOrder: true, cityId: true },
  });

  // Intermediate cities: appear in both sets, have agent, not from/to city
  const reachableSet = new Map<string, { routeId: string; stopOrder: number }[]>();
  for (const s of reachableFromFrom) {
    if (s.cityId === fromCityId || s.cityId === toCityId) continue;
    const fromOrder = fromStops.find(f => f.routeId === s.routeId)?.stopOrder ?? 999;
    if (s.stopOrder <= fromOrder) continue; // must be AFTER fromCity on that route
    if (!reachableSet.has(s.cityId)) reachableSet.set(s.cityId, []);
    reachableSet.get(s.cityId)!.push({ routeId: s.routeId, stopOrder: s.stopOrder });
  }

  const reachToSet = new Map<string, { routeId: string; stopOrder: number }[]>();
  for (const s of canReachTo) {
    if (s.cityId === fromCityId || s.cityId === toCityId) continue;
    const toOrder = toStops.find(t => t.routeId === s.routeId)?.stopOrder ?? 0;
    if (s.stopOrder >= toOrder) continue; // must be BEFORE toCity on that route
    if (!reachToSet.has(s.cityId)) reachToSet.set(s.cityId, []);
    reachToSet.get(s.cityId)!.push({ routeId: s.routeId, stopOrder: s.stopOrder });
  }

  // Intersection
  const intermediateCityIds = [...reachableSet.keys()].filter(id => reachToSet.has(id));
  if (!intermediateCityIds.length) return [];

  // Check which have an approved agent
  const agentsAtCities = await prisma.agent.findMany({
    where: { cityId: { in: intermediateCityIds }, status: "APPROVED" },
    select: { id: true, cityId: true, fullName: true, phone: true },
  });
  const agentMap = new Map(agentsAtCities.map(a => [a.cityId, a]));
  const validIntermediate = intermediateCityIds.filter(id => agentMap.has(id));
  if (!validIntermediate.length) return [];

  const agentConfig = await prisma.agentChargeConfig.findFirst({ where: { isActive: true } });
  const interimPct = Number(agentConfig?.agentInterimPct ?? 10) / 100;
  const finalPct = Number(agentConfig?.agentFinalPct ?? 5) / 100;

  const destAgentOneHop = await prisma.agent.findFirst({
    where: { cityId: toCityId, status: "APPROVED" },
    select: { id: true, fullName: true, phone: true },
  });

  const options = [];

  for (const midCityId of validIntermediate) {
    const agent = agentMap.get(midCityId)!;
    const midCity = await prisma.city.findUnique({ where: { id: midCityId }, select: { name: true } });

    // Find leg1: fromCity → midCity
    const leg1Routes = reachableSet.get(midCityId)!.map(s => s.routeId);
    const leg1Schedules = await prisma.schedule.findMany({
      where: { routeId: { in: leg1Routes }, isActive: true },
      include: {
        route: { include: { stops: { include: { city: { select: { name: true } } }, orderBy: { stopOrder: "asc" } } } },
        bus: { select: { name: true } },
        trips: { where: { travelDate } },
      },
      take: 1,
    });

    // Find leg2: midCity → toCity
    const leg2Routes = reachToSet.get(midCityId)!.map(s => s.routeId);
    const leg2Schedules = await prisma.schedule.findMany({
      where: { routeId: { in: leg2Routes }, isActive: true },
      include: {
        route: { include: { stops: { include: { city: { select: { name: true } } }, orderBy: { stopOrder: "asc" } } } },
        bus: { select: { name: true } },
        trips: { where: { travelDate } },
      },
      take: 1,
    });

    const sch1 = leg1Schedules[0];
    const sch2 = leg2Schedules[0];
    if (!sch1 || !sch2) continue;

    const trip1 = sch1.trips[0];
    const trip2 = sch2.trips[0];
    if (!trip1 || !trip2) continue;

    const [cap1, cap2] = await Promise.all([
      getAvailableCapacity(trip1.id),
      getAvailableCapacity(trip2.id),
    ]);
    const availKg  = Math.min(cap1.kg, cap2.kg);
    const availCm3 = Math.min(cap1.cm3, cap2.cm3);
    if (availKg < totalKg || availCm3 < totalCm3) continue;

    const fromStop1 = sch1.route.stops.find(s => s.cityId === fromCityId)!;
    const toStop1   = sch1.route.stops.find(s => s.cityId === midCityId)!;
    const fromStop2 = sch2.route.stops.find(s => s.cityId === midCityId)!;
    const toStop2   = sch2.route.stops.find(s => s.cityId === toCityId)!;
    if (!fromStop1 || !toStop1 || !fromStop2 || !toStop2) continue;

    const dist1 = Number(sch1.route.distanceKm ?? 0) * (toStop1.stopOrder - fromStop1.stopOrder) / Math.max(sch1.route.stops.length - 1, 1);
    const dist2 = Number(sch2.route.distanceKm ?? 0) * (toStop2.stopOrder - fromStop2.stopOrder) / Math.max(sch2.route.stops.length - 1, 1);
    const totalDist = dist1 + dist2;

    const freightCost = await calcFreightPrice(totalKg, totalCm3, totalDist);
    const agentCost   = Math.round(freightCost * interimPct);
    const finalAgentCharge = destAgentOneHop ? Math.round(freightCost * finalPct) : 0;

    const lastLeg2: any = {
      tripId: trip2.id, scheduleId: sch2.id, busName: sch2.bus.name,
      fromStopId: fromStop2.id, fromCityName: fromStop2.city.name, fromStopName: fromStop2.stopName,
      toStopId: toStop2.id, toCityName: toStop2.city.name, toStopName: toStop2.stopName,
      departureTime: sch2.departureTime.toISOString(), distanceKm: Math.round(dist2),
    };
    if (destAgentOneHop) {
      lastLeg2.destinationAgent = {
        agentId:    destAgentOneHop.id,
        agentName:  destAgentOneHop.fullName,
        agentPhone: destAgentOneHop.phone,
      };
      lastLeg2.agentCharge = finalAgentCharge;
    }

    options.push({
      type: "ONE_HOP" as const,
      legs: [
        {
          tripId: trip1.id, scheduleId: sch1.id, busName: sch1.bus.name,
          fromStopId: fromStop1.id, fromCityName: fromStop1.city.name, fromStopName: fromStop1.stopName,
          toStopId: toStop1.id, toCityName: toStop1.city.name, toStopName: toStop1.stopName,
          departureTime: sch1.departureTime.toISOString(), distanceKm: Math.round(dist1),
        },
        lastLeg2,
      ],
      transfers: [{
        cityName:   midCity?.name ?? "",
        agentId:    agent.id,
        agentName:  agent.fullName,
        agentPhone: agent.phone,
        agentCharge: agentCost,
      }],
      freightCost,
      agentCost: agentCost + finalAgentCharge,
      totalCost: freightCost + agentCost + finalAgentCharge,
      availableKg:  availKg,
      availableCm3: availCm3,
      ...(destAgentOneHop ? {
        destinationAgent: {
          agentId:    destAgentOneHop.id,
          agentName:  destAgentOneHop.fullName,
          agentPhone: destAgentOneHop.phone,
        },
        finalAgentCharge,
      } : {}),
    });
  }

  return options;
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

  // Parse as UTC midnight to match @db.Date storage
  const travelDate = new Date(dateStr + "T00:00:00.000Z");

  const volumeCm3 = lengthCm * breadthCm * heightCm;

  const [direct, oneHop] = await Promise.all([
    findDirectOptions(fromCityId, toCityId, travelDate, weightKg, volumeCm3),
    findOneHopOptions(fromCityId, toCityId, travelDate, weightKg, volumeCm3),
  ]);

  const options = [...direct, ...oneHop].sort((a, b) => a.totalCost - b.totalCost);

  // If no options, find nearest available date (check next 7 days)
  if (!options.length) {
    const availableDates: string[] = [];
    for (let d = 1; d <= 7; d++) {
      const nextDate = new Date(travelDate);
      nextDate.setDate(nextDate.getDate() + d);
      const [dir, hop] = await Promise.all([
        findDirectOptions(fromCityId, toCityId, nextDate, weightKg, volumeCm3),
        findOneHopOptions(fromCityId, toCityId, nextDate, weightKg, volumeCm3),
      ]);
      if (dir.length || hop.length) {
        availableDates.push(nextDate.toISOString().slice(0, 10));
        if (availableDates.length >= 3) break;
      }
    }
    return NextResponse.json({ options: [], availableDates });
  }

  return NextResponse.json({ options });
}
