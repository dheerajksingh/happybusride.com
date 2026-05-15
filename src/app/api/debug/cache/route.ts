import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

// TEMPORARY: Remove after Redis diagnosis.
export async function GET() {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ redis: "NOT_CONNECTED" });
  }

  // List every key in Redis
  const allKeys = await redis.keys("*");

  // For each key get its type and size
  const keyInfo: Record<string, unknown> = {};
  for (const k of allKeys.slice(0, 20)) {
    const val = await redis.get(k);
    const type = Array.isArray(val) ? `array(${(val as unknown[]).length})`
                : typeof val === "string" ? `string(${val.length} chars)`
                : typeof val;
    keyInfo[k] = type;
  }

  return NextResponse.json({
    redis: "CONNECTED",
    totalKeys: allKeys.length,
    keys: keyInfo,
  });
}
