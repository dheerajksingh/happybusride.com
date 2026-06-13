import { prisma } from "./prisma";

type StopInput = { cityId: string };

/**
 * For an ordered list of stops, returns cumulative distances from the origin
 * using the CityDistance cache (populated by Google Maps / Haversine).
 * Returns [0, d(stop0→stop1), d(stop0→stop1)+d(stop1→stop2), …]
 */
export async function calcCumulativeDistances(stops: StopInput[]): Promise<(number | null)[]> {
  if (stops.length === 0) return [];
  const result: (number | null)[] = [0];

  for (let i = 1; i < stops.length; i++) {
    const fromCityId = stops[i - 1].cityId;
    const toCityId   = stops[i].cityId;

    const cached = await prisma.cityDistance.findUnique({
      where: { fromCityId_toCityId: { fromCityId, toCityId } },
      select: { distanceKm: true },
    });

    const prev = result[i - 1];
    if (cached && prev !== null) {
      result.push(prev + Math.round(Number(cached.distanceKm)));
    } else {
      result.push(null); // distance unknown for this segment
    }
  }

  return result;
}
