import { NextRequest, NextResponse } from "next/server";
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
    return {
      distanceKm:   parseFloat((route.distanceMeters / 1000).toFixed(1)),
      durationMins: Math.round(parseInt(route.duration ?? "0") / 60),
      source: "google",
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromCityId = searchParams.get("fromCityId");
  const toCityId   = searchParams.get("toCityId");

  if (!fromCityId || !toCityId || fromCityId === toCityId) {
    return NextResponse.json({ error: "fromCityId and toCityId required and must differ" }, { status: 400 });
  }

  // Check DB cache first
  const cached = await prisma.cityDistance.findUnique({
    where: { fromCityId_toCityId: { fromCityId, toCityId } },
  });
  if (cached) {
    return NextResponse.json({
      distanceKm:   Number(cached.distanceKm),
      durationMins: cached.durationMins,
      source:       cached.source,
      cached:       true,
    });
  }

  const [fromCity, toCity] = await Promise.all([
    prisma.city.findUnique({ where: { id: fromCityId }, select: { latitude: true, longitude: true } }),
    prisma.city.findUnique({ where: { id: toCityId },   select: { latitude: true, longitude: true } }),
  ]);

  const lat1 = Number(fromCity?.latitude ?? 0);
  const lon1 = Number(fromCity?.longitude ?? 0);
  const lat2 = Number(toCity?.latitude ?? 0);
  const lon2 = Number(toCity?.longitude ?? 0);

  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return NextResponse.json({ error: "City coordinates not available" }, { status: 422 });
  }

  let result = await fetchFromGoogleMaps(lat1, lon1, lat2, lon2);
  if (!result) {
    const distanceKm = haversineKm(lat1, lon1, lat2, lon2);
    result = { distanceKm, durationMins: Math.round(distanceKm), source: "haversine" };
  }

  // Cache both directions
  await prisma.cityDistance.createMany({
    data: [
      { fromCityId, toCityId,   distanceKm: result.distanceKm, durationMins: result.durationMins, source: result.source },
      { fromCityId: toCityId, toCityId: fromCityId, distanceKm: result.distanceKm, durationMins: result.durationMins, source: result.source },
    ],
    skipDuplicates: true,
  });

  return NextResponse.json({ ...result, cached: false });
}
