import { NextResponse } from "next/server";

// TEMPORARY: Remove this route once env var issue is resolved.
export async function GET() {
  const vars = [
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

  const result = Object.fromEntries(
    vars.map((key) => {
      const val = process.env[key];
      if (!val) return [key, "❌ MISSING"];
      return [key, `✅ set (${val.slice(0, 8)}…)`];
    })
  );

  return NextResponse.json(result);
}
