import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) ** 2;
  return parseFloat((2 * R * Math.asin(Math.sqrt(a)) * 1.35).toFixed(1));
}

async function fetchFromGoogleMaps(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): Promise<{ distanceKm: number; durationMins: number; source: string } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
      },
      body: JSON.stringify({
        origin:      { location: { latLng: { latitude: lat1, longitude: lon1 } } },
        destination: { location: { latLng: { latitude: lat2, longitude: lon2 } } },
        travelMode: "DRIVE",
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.routes?.length) return null;

    const route = data.routes[0];
    const distanceKm  = parseFloat((route.distanceMeters / 1000).toFixed(1));
    // duration is a string like "3600s"
    const durationSec = parseInt(route.duration ?? "0");
    const durationMins = Math.round(durationSec / 60);

    return { distanceKm, durationMins, source: "google" };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !["OPERATOR", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const fromCityId = searchParams.get("fromCityId");
  const toCityId   = searchParams.get("toCityId");

  if (!fromCityId || !toCityId) {
    return NextResponse.json({ error: "fromCityId and toCityId required" }, { status: 400 });
  }
  if (fromCityId === toCityId) {
    return NextResponse.json({ error: "Cities must be different" }, { status: 400 });
  }

  // ── 1. Check DB cache ─────────────────────────────────────────
  const cached = await prisma.cityDistance.findUnique({
    where: { fromCityId_toCityId: { fromCityId, toCityId } },
  });
  if (cached) {
    return NextResponse.json({
      distanceKm:  Number(cached.distanceKm),
      durationMins: cached.durationMins,
      source:       cached.source,
      cached:       true,
    });
  }

  // ── 2. Load cities (need lat/lon) ─────────────────────────────
  const [fromCity, toCity] = await Promise.all([
    prisma.city.findUnique({ where: { id: fromCityId }, select: { latitude: true, longitude: true, name: true } }),
    prisma.city.findUnique({ where: { id: toCityId },   select: { latitude: true, longitude: true, name: true } }),
  ]);

  if (!fromCity || !toCity) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  const lat1 = Number(fromCity.latitude);
  const lon1 = Number(fromCity.longitude);
  const lat2 = Number(toCity.latitude);
  const lon2 = Number(toCity.longitude);

  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return NextResponse.json({ error: "City coordinates not available" }, { status: 422 });
  }

  // ── 3. Try Google Maps, fall back to Haversine ────────────────
  let result = await fetchFromGoogleMaps(lat1, lon1, lat2, lon2);

  if (!result) {
    const distanceKm = haversineKm(lat1, lon1, lat2, lon2);
    result = {
      distanceKm,
      durationMins: Math.round((distanceKm / 60) * 60),
      source: "haversine",
    };
  }

  // ── 4. Save to DB (both directions) ──────────────────────────
  await prisma.cityDistance.createMany({
    data: [
      {
        fromCityId,
        toCityId,
        distanceKm:   result.distanceKm,
        durationMins: result.durationMins,
        source:       result.source,
      },
      {
        fromCityId:  toCityId,
        toCityId:    fromCityId,
        distanceKm:  result.distanceKm,
        durationMins: result.durationMins,
        source:       result.source,
      },
    ],
    skipDuplicates: true,
  });

  return NextResponse.json({
    distanceKm:   result.distanceKm,
    durationMins: result.durationMins,
    source:       result.source,
    cached:       false,
  });
}
