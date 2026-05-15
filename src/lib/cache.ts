/**
 * Generic Redis cache helpers.
 * All keys are namespaced under "cache:" to avoid collisions.
 * All functions degrade gracefully when Redis is unavailable.
 */

import { getRedis } from "./redis";

const NS = "cache:";
const META_SUFFIX = ":meta";

export interface CacheMeta {
  uploadedAt: string;
  count: number;
  columns: string[];
  source: string;
}

function dataKey(key: string) { return `${NS}${key}`; }
function metaKey(key: string) { return `${NS}${key}${META_SUFFIX}`; }

/** Get cached data. Returns null on miss or when Redis is unavailable. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    return (await redis.get<T>(dataKey(key))) ?? null;
  } catch {
    return null;
  }
}

/** Store data in cache. No-op when Redis is unavailable. */
export async function cacheSet<T>(
  key: string,
  data: T,
  meta: Omit<CacheMeta, "uploadedAt">,
  ttlSeconds?: number
): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    const opts = ttlSeconds ? { ex: ttlSeconds } : undefined;
    await Promise.all([
      redis.set(dataKey(key), data, opts),
      redis.set(metaKey(key), { ...meta, uploadedAt: new Date().toISOString() } satisfies CacheMeta),
    ]);
  } catch {
    // Redis unavailable — continue without caching
  }
}

/** Delete a cache key and its metadata. No-op when Redis is unavailable. */
export async function cacheDel(key: string): Promise<void> {
  try {
    const redis = getRedis();
    if (!redis) return;
    await redis.del(dataKey(key), metaKey(key));
  } catch {
    // ignore
  }
}

/** List all cache keys. Returns empty array when Redis is unavailable. */
export async function cacheKeys(): Promise<string[]> {
  try {
    const redis = getRedis();
    if (!redis) return [];
    const keys = await redis.keys(`${NS}*`);
    return keys
      .filter((k) => !k.endsWith(META_SUFFIX))
      .map((k) => k.slice(NS.length));
  } catch {
    return [];
  }
}

/** Get metadata for a cache key. Returns null when Redis is unavailable. */
export async function cacheGetMeta(key: string): Promise<CacheMeta | null> {
  try {
    const redis = getRedis();
    if (!redis) return null;
    return redis.get<CacheMeta>(metaKey(key));
  } catch {
    return null;
  }
}
