import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;
let _attempted = false;

/** Returns a Redis client, or null if env vars are not configured. */
export function getRedis(): Redis | null {
  if (_attempted) return _redis;
  _attempted = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("[redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set — Redis disabled, falling back to DB.");
    return null;
  }

  _redis = new Redis({ url, token });
  return _redis;
}
