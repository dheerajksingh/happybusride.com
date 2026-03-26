import { NextResponse } from "next/server";

// TEMPORARY: Remove after diagnosis.
export async function GET() {
  // Show ALL keys present in the Lambda environment (no values exposed)
  const allKeys = Object.keys(process.env).sort();

  // Check specific vars we care about
  const check = [
    "DATABASE_URL",
    "AUTH_SECRET",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "AUTH_TRUST_HOST",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "OTP_DEV_CODE",
    "AWS_BUCKET_NAME",
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
  ];

  const specific = Object.fromEntries(
    check.map((key) => {
      const val = process.env[key];
      if (!val) return [key, "❌ MISSING"];
      return [key, `✅ (${val.slice(0, 8)}…)`];
    })
  );

  return NextResponse.json({ allKeys, specific });
}
