import { NextRequest, NextResponse } from "next/server";

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

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Straight-line fallback: sum of Haversine distances between consecutive waypoints
function straightLineFallback(waypoints: { lat: number; lng: number }[]) {
  let total = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    total += haversineKm(waypoints[i], waypoints[i + 1]);
  }
  // Apply 1.35x road factor (typical ratio of road distance to straight-line)
  const roadEstimate = parseFloat((total * 1.35).toFixed(1));
  const polyline: [number, number][] = waypoints.map((w) => [w.lat, w.lng]);
  return { distanceKm: roadEstimate, polyline, fallback: true };
}

// POST { waypoints: [{lat,lng}] }
// Returns { distanceKm, polyline: [lat,lng][], fallback?: true }
export async function POST(req: NextRequest) {
  const { waypoints } = await req.json();
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return NextResponse.json({ error: "At least 2 waypoints required" }, { status: 400 });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;

  if (key) {
    try {
      const toLatLng = (p: { lat: number; lng: number }) => ({
        location: { latLng: { latitude: p.lat, longitude: p.lng } },
      });

      const body: Record<string, any> = {
        origin: toLatLng(waypoints[0]),
        destination: toLatLng(waypoints[waypoints.length - 1]),
        travelMode: "DRIVE",
        polylineEncoding: "ENCODED_POLYLINE",
      };
      if (waypoints.length > 2) {
        body.intermediates = waypoints.slice(1, -1).map(toLatLng);
      }

      const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "routes.distanceMeters,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.routes?.length) {
        const route = data.routes[0];
        return NextResponse.json({
          distanceKm: parseFloat((route.distanceMeters / 1000).toFixed(1)),
          polyline: decodePolyline(route.polyline.encodedPolyline),
        });
      }

      // Routes API failed — fall through to Haversine
      console.warn("[route-distance] Routes API unavailable:", data.error?.message ?? res.status);
    } catch (e) {
      console.warn("[route-distance] Routes API exception:", e);
    }
  }

  // Fallback: straight-line Haversine with road factor
  return NextResponse.json(straightLineFallback(waypoints));
}
