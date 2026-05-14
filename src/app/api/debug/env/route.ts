import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// TEMPORARY: Remove after Google Maps env var diagnosis.
export async function GET() {
  const vars = [
    "DATABASE_URL",
    "AUTH_SECRET",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "OTP_DEV_CODE",
    "AWS_BUCKET_NAME",
    "AWS_REGION",
    "GOOGLE_MAPS_API_KEY",
    "GOOGLE_MAPS_PUBLIC_KEY",
    "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
  ];

  const result = Object.fromEntries(
    vars.map((key) => {
      const val = process.env[key];
      if (!val) return [key, "❌ MISSING"];
      return [key, `✅ set (${val.slice(0, 8)}…)`];
    })
  );

  // Also check if .env.production.local is readable
  const cwd = process.cwd();
  const envPath = path.join(cwd, ".env.production.local");
  const envExists = fs.existsSync(envPath);
  const envLines = envExists
    ? fs.readFileSync(envPath, "utf8")
        .split("\n")
        .filter((l) => l.includes("GOOGLE") || l.includes("DATABASE"))
        .map((l) => l.replace(/=.+/, "=***"))
    : [];

  return NextResponse.json({ vars: result, cwd, envFile: { exists: envExists, googleLines: envLines } });
}
