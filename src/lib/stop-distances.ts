import { prisma } from "./prisma";

type StopInput = { cityId: string };

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  // 1.35 road-distance factor over straight-line
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.35);
}

/**
 * For an ordered list of stops, returns cumulative distances from the origin.
 * Uses CityDistance cache first; falls back to Haversine from city coordinates.
 * Returns [0, d(0→1), d(0→1)+d(1→2), …]. Null only if coordinates are missing.
 */
export async function calcCumulativeDistances(stops: StopInput[]): Promise<(number | null)[]> {
  if (stops.length === 0) return [];

  const cityIds = stops.map((s) => s.cityId);
  const cities = await prisma.city.findMany({
    where: { id: { in: cityIds } },
    select: { id: true, latitude: true, longitude: true },
  });
  const cityMap = new Map(cities.map((c) => [c.id, c]));

  const result: (number | null)[] = [0];

  for (let i = 1; i < stops.length; i++) {
    const fromCityId = stops[i - 1].cityId;
    const toCityId = stops[i].cityId;
    const prev = result[i - 1];
    if (prev === null) { result.push(null); continue; }

    // 1. Try CityDistance cache
    const cached = await prisma.cityDistance.findUnique({
      where: { fromCityId_toCityId: { fromCityId, toCityId } },
      select: { distanceKm: true },
    });

    if (cached) {
      result.push(prev + Math.round(Number(cached.distanceKm)));
      continue;
    }

    // 2. Fall back to Haversine using city coordinates
    const from = cityMap.get(fromCityId);
    const to = cityMap.get(toCityId);
    if (
      from?.latitude != null && from?.longitude != null &&
      to?.latitude != null && to?.longitude != null
    ) {
      const km = haversineKm(
        Number(from.latitude), Number(from.longitude),
        Number(to.latitude), Number(to.longitude),
      );
      result.push(prev + km);
    } else {
      result.push(null);
    }
  }

  return result;
}
