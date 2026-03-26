/**
 * Generic Redis cache helpers.
 * All keys are namespaced under "cache:" to avoid collisions.
 *
 * Usage:
 *   await cacheSet("cities", citiesArray);
 *   const cities = await cacheGet<City[]>("cities");
 *   await cacheDel("cities");
 *   const keys = await cacheKeys();
 */

import { getRedis } from "./redis";

const NS = "cache:";
const META_SUFFIX = ":meta";

export interface CacheMeta {
  uploadedAt: string;
  count: number;
  columns: string[];
  source: string; // e.g. "csv", "manual"
}

function dataKey(key: string) { return `${NS}${key}`; }
function metaKey(key: string) { return `${NS}${key}${META_SUFFIX}`; }

/** Get cached data. Returns null on miss. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    const val = await redis.get<T>(dataKey(key));
    return val ?? null;
  } catch {
    return null;
  }
}

/** Store data in cache with optional TTL in seconds (default: no expiry). */
export async function cacheSet<T>(
  key: string,
  data: T,
  meta: Omit<CacheMeta, "uploadedAt">,
  ttlSeconds?: number
): Promise<void> {
  const redis = getRedis();
  const opts = ttlSeconds ? { ex: ttlSeconds } : undefined;
  await Promise.all([
    redis.set(dataKey(key), data, opts),
    redis.set(metaKey(key), { ...meta, uploadedAt: new Date().toISOString() } satisfies CacheMeta),
  ]);
}

/** Delete a cache key and its metadata. */
export async function cacheDel(key: string): Promise<void> {
  const redis = getRedis();
  await redis.del(dataKey(key), metaKey(key));
}

/** List all cache keys (without the "cache:" prefix, without ":meta" entries). */
export async function cacheKeys(): Promise<string[]> {
  const redis = getRedis();
  const keys = await redis.keys(`${NS}*`);
  return keys
    .filter((k) => !k.endsWith(META_SUFFIX))
    .map((k) => k.slice(NS.length));
}

/** Get metadata for a cache key. */
export async function cacheGetMeta(key: string): Promise<CacheMeta | null> {
  const redis = getRedis();
  return redis.get<CacheMeta>(metaKey(key));
}
