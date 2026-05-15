import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { cacheGet } from "@/lib/cache";

// TEMPORARY: Remove after Redis diagnosis.
export async function GET() {
  const redis = getRedis();

  if (!redis) {
    return NextResponse.json({ redis: "❌ not connected — UPSTASH env vars missing" });
  }

  const t0 = Date.now();
  const cities = await cacheGet<unknown[]>("cities");
  const ms = Date.now() - t0;

  return NextResponse.json({
    redis: "✅ connected",
    citiesCache: cities
      ? `✅ ${cities.length} cities cached (${ms}ms)`
      : `❌ empty — upload cities CSV via /admin/cache`,
    sampleCities: Array.isArray(cities) ? cities.slice(0, 3) : null,
  });
}
