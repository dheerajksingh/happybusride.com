import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const ROUTE_COLORS = [
  "#2563eb", "#16a34a", "#d97706", "#7c3aed",
  "#dc2626", "#0891b2", "#be185d", "#059669",
];

// ── Geocoding ─────────────────────────────────────────────────

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}&region=in`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.length) return null;
    return data.results[0].geometry.location as { lat: number; lng: number };
  } catch { return null; }
}

// ── Polyline decoder ──────────────────────────────────────────

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

// ── Clustering ────────────────────────────────────────────────

interface Employee { id: string; name: string; lat: number; lng: number; }

interface Stop {
  lat: number;
  lng: number;
  employees: Employee[];
}

function clusterEmployees(
  employees: Employee[],
  gridSize = 0.015
): Stop[] {
  const buckets = new Map<string, Employee[]>();
  for (const emp of employees) {
    const key = `${Math.round(emp.lat / gridSize)},${Math.round(emp.lng / gridSize)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(emp);
  }
  return Array.from(buckets.values()).map((g) => ({
    lat: g.reduce((s, e) => s + e.lat, 0) / g.length,
    lng: g.reduce((s, e) => s + e.lng, 0) / g.length,
    employees: g,
  }));
}

// ── Haversine ─────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Nearest-neighbour time estimate for a set of stops → office (25 km/h + 1.35 road factor)
function estimateMins(stops: Stop[], officeLat: number, officeLng: number): number {
  if (stops.length === 0) return 0;
  const unvisited = [...stops];
  let distKm = 0, curLat = officeLat, curLng = officeLng;
  while (unvisited.length > 0) {
    let minD = Infinity, idx = 0;
    for (let i = 0; i < unvisited.length; i++) {
      const d = haversineKm(curLat, curLng, unvisited[i].lat, unvisited[i].lng);
      if (d < minD) { minD = d; idx = i; }
    }
    const s = unvisited.splice(idx, 1)[0];
    distKm += minD; curLat = s.lat; curLng = s.lng;
  }
  distKm += haversineKm(curLat, curLng, officeLat, officeLng);
  // 1.4× road factor, 20 km/h avg city speed → ~4.2 min/km
  // Deliberately ~30% higher than naïve (3.24 min/km) to leave headroom
  // for actual road conditions, without over-splitting into single-stop buses.
  // Post-validation catches any routes that still slip over the limit.
  return Math.round(distKm * 1.4 / 20 * 60);
}

// ── Greedy time-aware route builder ──────────────────────────
//
// Builds bus routes one at a time:
//   1. Start each route with the unassigned stop furthest from office
//   2. Repeatedly add the nearest unassigned stop that keeps estimated
//      travel time within maxMins
//   3. Open a new bus when no more stops fit

function buildGreedyRoutes(
  stops: Stop[],
  officeLat: number,
  officeLng: number,
  maxMins: number
): Stop[][] {
  const unassigned = [...stops];
  const routes: Stop[][] = [];

  while (unassigned.length > 0) {
    // Start this route from the stop furthest from office
    let maxDist = -1, startIdx = 0;
    for (let i = 0; i < unassigned.length; i++) {
      const d = haversineKm(officeLat, officeLng, unassigned[i].lat, unassigned[i].lng);
      if (d > maxDist) { maxDist = d; startIdx = i; }
    }
    const route: Stop[] = [unassigned.splice(startIdx, 1)[0]];

    // Greedily add nearest stop that keeps time within limit
    while (unassigned.length > 0) {
      const last = route[route.length - 1];
      let bestIdx = -1, bestDist = Infinity;

      for (let i = 0; i < unassigned.length; i++) {
        const d = haversineKm(last.lat, last.lng, unassigned[i].lat, unassigned[i].lng);
        if (d < bestDist) {
          const estMins = estimateMins([...route, unassigned[i]], officeLat, officeLng);
          if (estMins <= maxMins) { bestDist = d; bestIdx = i; }
        }
      }

      if (bestIdx === -1) break;
      route.push(unassigned.splice(bestIdx, 1)[0]);
    }

    routes.push(route);
  }

  return routes;
}

// ── Fallback route (Haversine, no Roads API) ──────────────────

function fallbackRoute(stops: Stop[], officeLat: number, officeLng: number) {
  const unvisited = [...stops];
  const ordered: Stop[] = [];
  let curLat = officeLat, curLng = officeLng;
  while (unvisited.length > 0) {
    let minD = Infinity, idx = 0;
    for (let i = 0; i < unvisited.length; i++) {
      const d = haversineKm(curLat, curLng, unvisited[i].lat, unvisited[i].lng);
      if (d < minD) { minD = d; idx = i; }
    }
    const s = unvisited.splice(idx, 1)[0];
    ordered.push(s); curLat = s.lat; curLng = s.lng;
  }
  const orderedStops = ordered.reverse();
  const pts = [...orderedStops, { lat: officeLat, lng: officeLng }];
  let distM = 0;
  for (let i = 0; i < pts.length - 1; i++)
    distM += haversineKm(pts[i].lat, pts[i].lng, pts[i + 1].lat, pts[i + 1].lng) * 1000;
  return {
    orderedStops,
    distanceM: Math.round(distM * 1.35),
    durationS: Math.round(distM * 1.4 / 1000 / 20 * 3600),
    polyline: pts.map((p): [number, number] => [p.lat, p.lng]),
    isFallback: true,
  };
}

// ── Google Routes API call ────────────────────────────────────

async function getGoogleRoute(stops: Stop[], officeLat: number, officeLng: number) {
  if (stops.length === 0) return fallbackRoute(stops, officeLat, officeLng);

  const key = process.env.GOOGLE_MAPS_API_KEY;
  // Routes API max 25 intermediates — hard cap (greedy builder already limits this)
  const capped = stops.length > 25 ? stops.slice(0, 25) : stops;

  if (key) {
    try {
      const toLoc = (lat: number, lng: number) => ({ location: { latLng: { latitude: lat, longitude: lng } } });
      const body: Record<string, any> = {
        origin: toLoc(capped[0].lat, capped[0].lng),
        destination: toLoc(officeLat, officeLng),
        travelMode: "DRIVE",
        optimizeWaypointOrder: capped.length > 1,
        polylineEncoding: "ENCODED_POLYLINE",
      };
      if (capped.length > 1) body.intermediates = capped.slice(1).map((s) => toLoc(s.lat, s.lng));

      const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask":
            "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.optimizedIntermediateWaypointIndex",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.routes?.length) {
        const route = data.routes[0];
        const order: number[] = route.optimizedIntermediateWaypointIndex ?? [];
        const orderedStops = [capped[0], ...order.map((i: number) => capped[i + 1])];
        return {
          orderedStops,
          distanceM: route.distanceMeters as number,
          durationS: parseInt(route.duration ?? "0", 10),
          polyline: decodePolyline(route.polyline.encodedPolyline),
          isFallback: false,
        };
      }
      console.warn("[routes] Routes API error:", res.status, data.error?.message);
    } catch (e) {
      console.warn("[routes] Routes API exception:", e);
    }
  }

  return fallbackRoute(capped, officeLat, officeLng);
}

// ── GET ───────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["CORPORATE", "OPERATOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const routes = await prisma.corporateRoute.findMany({
    where: { requestId: id },
    include: { stops: { orderBy: { stopOrder: "asc" } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ routes });
}

// ── POST ──────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "CORPORATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const clientOfficeLat: number | null = body.officeLat ?? null;
  const clientOfficeLng: number | null = body.officeLng ?? null;

  const request = await prisma.corporateCharterRequest.findFirst({
    where: { id, companyId: session.user.corporateCompanyId! },
    include: { employees: { where: { latitude: { not: null }, longitude: { not: null } } } },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Resolve office coordinates
  let officeLat: number = clientOfficeLat ?? (request.officeLat ? Number(request.officeLat) : 0);
  let officeLng: number = clientOfficeLng ?? (request.officeLng ? Number(request.officeLng) : 0);

  if (!officeLat || !officeLng) {
    const coords = await geocodeAddress(`${request.officeAddress}, ${request.city}, ${request.state}, India`);
    if (!coords) {
      return NextResponse.json({ error: "Could not locate office address. Load the map tab first." }, { status: 400 });
    }
    officeLat = coords.lat; officeLng = coords.lng;
  }
  if (!request.officeLat || !request.officeLng) {
    await prisma.corporateCharterRequest.update({ where: { id }, data: { officeLat, officeLng } });
  }

  const mappable = request.employees.filter(
    (e) => e.latitude != null && e.longitude != null
  ) as (typeof request.employees[number] & { latitude: number; longitude: number })[];

  if (mappable.length === 0) {
    return NextResponse.json({ error: "No employees with mapped addresses." }, { status: 400 });
  }

  // Build fine-grained clusters (pickup stops), each ~1.5 km radius
  const employees: Employee[] = mappable.map((e) => ({
    id: e.id, name: e.name, lat: Number(e.latitude), lng: Number(e.longitude),
  }));
  // 1 degree latitude ≈ 111 km → convert radius to grid cell size
  const radiusKm = request.clusterRadiusKm ? Number(request.clusterRadiusKm) : 1.5;
  const gridSize = radiusKm / 111;
  const stops = clusterEmployees(employees, gridSize);

  const maxMins = request.maxTravelMins ?? 60;
  console.log(`[routes] ${employees.length} employees → ${stops.length} stops (radius ${radiusKm}km), maxMins=${maxMins}`);

  // Greedy time-aware route assignment (conservative Haversine estimate)
  const zoneGroups = buildGreedyRoutes(stops, officeLat, officeLng, maxMins);
  console.log(`[routes] Greedy split → ${zoneGroups.length} bus route(s)`);

  // Call Routes API for each bus in parallel (actual road times)
  const rawResults = await Promise.all(
    zoneGroups.map((group) => getGoogleRoute(group, officeLat, officeLng))
  );

  // Post-validate: any route whose actual road time exceeds maxMins gets re-split
  const results: typeof rawResults = [];
  for (const r of rawResults) {
    const actualMins = Math.round(r.durationS / 60);
    if (r.isFallback || r.orderedStops.length <= 1 || actualMins <= maxMins) {
      results.push(r);
      continue;
    }
    // Re-split this overrun route
    const n = Math.ceil(actualMins / maxMins);
    console.log(`[routes] Route overran (${actualMins} min > ${maxMins} min) → re-splitting into ${n}`);
    const subGroups = buildGreedyRoutes(r.orderedStops, officeLat, officeLng, maxMins);
    const subResults = await Promise.all(
      subGroups.map((g) => getGoogleRoute(g, officeLat, officeLng))
    );
    results.push(...subResults);
  }
  console.log(`[routes] Final: ${results.length} bus route(s)`);

  // Persist routes
  await prisma.corporateRoute.deleteMany({ where: { requestId: id } });

  const savedRoutes = await Promise.all(
    results.map((result, idx) =>
      prisma.corporateRoute.create({
        data: {
          requestId: id,
          name: results.length === 1 ? "Optimal Route" : `Bus ${idx + 1}`,
          distanceKm: result.distanceM / 1000,
          durationMins: Math.round(result.durationS / 60),
          stops: {
            create: [
              ...result.orderedStops.map((stop, i) => ({
                stopOrder: i + 1,
                address: stop.employees.map((e) => e.name).join(", "),
                latitude: stop.lat,
                longitude: stop.lng,
                employeeCount: stop.employees.length,
                pickupTime: null,
              })),
              {
                stopOrder: result.orderedStops.length + 1,
                address: request.officeAddress,
                latitude: officeLat,
                longitude: officeLng,
                employeeCount: 0,
                pickupTime: request.arrivalTime,
              },
            ],
          },
        },
        include: { stops: { orderBy: { stopOrder: "asc" } } },
      })
    )
  );

  return NextResponse.json({
    routes: savedRoutes,
    routeDetails: results.map((r, idx) => ({
      routeId: savedRoutes[idx].id,
      polyline: r.polyline,
      distanceKm: (r.distanceM / 1000).toFixed(2),
      durationMins: Math.round(r.durationS / 60),
      color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
      isFallback: r.isFallback,
      stops: savedRoutes[idx].stops.map((s) => ({
        stopOrder: s.stopOrder,
        address: s.address,
        lat: Number(s.latitude),
        lng: Number(s.longitude),
        employeeCount: s.employeeCount,
        pickupTime: s.pickupTime,
      })),
      // Employee home locations for this bus's stops
      employees: r.orderedStops.flatMap((stop) =>
        stop.employees.map((e) => ({ name: e.name, lat: e.lat, lng: e.lng }))
      ),
    })),
    totalRoutes: savedRoutes.length,
    totalEmployees: employees.length,
    isFallback: results.some((r) => r.isFallback),
  });
}
