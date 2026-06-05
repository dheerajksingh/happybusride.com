/**
 * Next.js instrumentation hook — runs once at server startup.
 * Validates required environment variables before the app accepts requests.
 * Only truly critical vars (no fallback) cause a hard failure.
 * Everything else logs a warning so features degrade gracefully.
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVar[] = [
  // ── Critical — app cannot function without these ─────────────
  { name: "DATABASE_URL", required: true, description: "PostgreSQL connection string" },
  { name: "AUTH_SECRET",  required: true, description: "NextAuth session signing secret" },

  // ── Important — features degrade without these ───────────────
  { name: "ANTHROPIC_API_KEY",        required: false, description: "Claude API key — pricing generator buttons won't work" },
  { name: "UPSTASH_REDIS_REST_URL",   required: false, description: "Upstash Redis URL — city cache disabled, falls back to DB" },
  { name: "UPSTASH_REDIS_REST_TOKEN", required: false, description: "Upstash Redis token" },

  // ── Optional — graceful fallback exists ──────────────────────
  { name: "GOOGLE_MAPS_API_KEY", required: false, description: "Google Maps — road distance falls back to Haversine estimate" },
  { name: "AWS_BUCKET_NAME",     required: false, description: "S3 bucket — file uploads fall back to local disk" },
  { name: "AWS_REGION",          required: false, description: "S3 region" },
  { name: "MSG91_API_KEY",       required: false, description: "MSG91 SMS OTP — falls back to OTP_DEV_CODE in dev" },
];

export async function register() {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const v of ENV_VARS) {
    const value = process.env[v.name];
    if (!value) {
      if (v.required) {
        missing.push(`  ✗ ${v.name} — ${v.description}`);
      } else {
        warnings.push(`  ⚠ ${v.name} not set — ${v.description}`);
      }
    }
  }

  if (warnings.length) {
    console.warn("\n[env] Optional/degraded environment variables not set:");
    warnings.forEach((w) => console.warn(w));
    console.warn("");
  }

  if (missing.length) {
    const msg = [
      "\n[env] ✗ STARTUP FAILED — critical environment variables missing:",
      ...missing,
      "\nSet these in .env (local) or Amplify Environment Variables (production).\n",
    ].join("\n");

    console.error(msg);
    throw new Error(`Missing critical environment variables:\n${missing.join("\n")}`);
  }

  console.log("[env] ✓ Environment variables validated");
}
