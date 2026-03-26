import { Redis } from "@upstash/redis";

// Singleton Redis client using Upstash REST API (works on Lambda/Edge/Node)
// Redis.fromEnv() reads UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// directly from the runtime environment at call time.
let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = Redis.fromEnv();
  }
  return _redis;
}
