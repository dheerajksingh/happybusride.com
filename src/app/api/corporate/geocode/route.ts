import { NextRequest, NextResponse } from "next/server";

async function geocodeOne(address: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) { console.error("[geocode] GOOGLE_MAPS_API_KEY not set"); return null; }
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}&region=in`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.length) {
      console.error("[geocode] Google error:", data.status, data.error_message ?? "");
      return null;
    }
    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  } catch (e) {
    console.error("[geocode] exception:", e);
    return null;
  }
}

// Accepts: { addresses: string[] }
// Returns: { results: ({ lat, lng } | null)[] }
// Google Geocoding has generous rate limits — geocode in parallel
export async function POST(req: NextRequest) {
  const { addresses } = await req.json();
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return NextResponse.json({ results: [] });
  }
  const results = await Promise.all(addresses.map(geocodeOne));
  return NextResponse.json({ results });
}
