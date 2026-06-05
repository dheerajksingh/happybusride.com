/**
 * Next.js instrumentation hook — runs once at server startup.
 * Uses explicit dot notation so webpack/DefinePlugin replaces
 * each value at build time from next.config.ts env block.
 */
export async function register() {
  const missing: string[] = [];
  const warnings: string[] = [];

  function check(name: string, value: string | undefined, required: boolean, description: string) {
    if (!value) {
      if (required) missing.push(`  ✗ ${name} — ${description}`);
      else warnings.push(`  ⚠ ${name} not set — ${description}`);
    }
  }

  // ── Critical (app cannot function without these) ─────────────
  check("DATABASE_URL", process.env.DATABASE_URL, true,  "PostgreSQL connection string");
  check("AUTH_SECRET",  process.env.AUTH_SECRET,  true,  "NextAuth session signing secret");

  // ── Important (features degrade) ─────────────────────────────
  check("ANTHROPIC_API_KEY",        process.env.ANTHROPIC_API_KEY,        false, "Claude API key — pricing generator buttons won't work");
  check("UPSTASH_REDIS_REST_URL",   process.env.UPSTASH_REDIS_REST_URL,   false, "Upstash Redis URL — city cache falls back to DB");
  check("UPSTASH_REDIS_REST_TOKEN", process.env.UPSTASH_REDIS_REST_TOKEN, false, "Upstash Redis token");

  // ── Optional (graceful fallback exists) ──────────────────────
  check("GOOGLE_MAPS_API_KEY", process.env.GOOGLE_MAPS_API_KEY, false, "Google Maps — road distance falls back to Haversine");
  check("AWS_BUCKET_NAME",     process.env.AWS_BUCKET_NAME,     false, "S3 bucket — file uploads fall back to local disk");
  check("MSG91_API_KEY",       process.env.MSG91_API_KEY,       false, "MSG91 SMS OTP — falls back to OTP_DEV_CODE in dev");

  if (warnings.length) {
    console.warn("[env] Some environment variables not set (features will degrade):");
    warnings.forEach((w) => console.warn(w));
  }

  if (missing.length) {
    const msg = [
      "[env] ✗ STARTUP FAILED — critical environment variables missing:",
      ...missing,
      "Set these in .env (local) or Amplify Environment Variables (production).",
    ].join("\n");
    console.error(msg);
    throw new Error(msg);
  }

  console.log("[env] ✓ Environment variables validated");
}
