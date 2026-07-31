/**
 * Shared Redis URL helper for all backend services.
 * Prefer REDIS_URL (Render / Upstash). Falls back to local Redis.
 */
export function redisUrl(): string {
  return process.env.REDIS_URL || "redis://localhost:6379";
}

export function createRedisOptions() {
  const url = redisUrl();
  // Upstash / some managed Redis require TLS (rediss://)
  if (url.startsWith("rediss://")) {
    return { url, socket: { tls: true, rejectUnauthorized: false } as const };
  }
  return { url };
}
