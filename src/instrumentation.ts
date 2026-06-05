/**
 * Next.js instrumentation hook — runs once at server startup.
 * Validates all required environment variables before the app
 * accepts any requests. A missing var fails the boot immediately
 * rather than surfacing as a mid-request error.
 */

interface EnvVar {
  name: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVar[] = [
  // ── Core ────────────────────────────────────────────────────
  { name: "DATABASE_URL",    required: true,  description: "PostgreSQL connection string" },
  { name: "AUTH_SECRET",     required: true,  description: "NextAuth session signing secret" },

  // ── AI ──────────────────────────────────────────────────────
  { name: "ANTHROPIC_API_KEY", required: true, description: "Anthropic Claude API key (pricing calculators)" },

  // ── Redis ───────────────────────────────────────────────────
  { name: "UPSTASH_REDIS_REST_URL",   required: true, description: "Upstash Redis URL (city cache)" },
  { name: "UPSTASH_REDIS_REST_TOKEN", required: true, description: "Upstash Redis token" },

  // ── Optional (graceful fallback exists) ─────────────────────
  { name: "GOOGLE_MAPS_API_KEY", required: false, description: "Google Maps (road distance — falls back to Haversine)" },
  { name: "AWS_BUCKET_NAME",     required: false, description: "S3 bucket (file uploads — falls back to local disk)" },
  { name: "AWS_REGION",          required: false, description: "S3 region" },
  { name: "MSG91_API_KEY",       required: false, description: "MSG91 SMS OTP (falls back to OTP_DEV_CODE)" },
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
    console.warn("\n[env] Optional environment variables not set:");
    warnings.forEach((w) => console.warn(w));
  }

  if (missing.length) {
    const msg = [
      "\n[env] ✗ STARTUP FAILED — required environment variables missing:",
      ...missing,
      "\nSet these in your .env file (local) or Amplify Environment Variables (production).\n",
    ].join("\n");

    console.error(msg);
    throw new Error(`Missing required environment variables:\n${missing.join("\n")}`);
  }

  console.log("[env] ✓ All required environment variables present");
}
