import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// TEMPORARY: Remove after diagnosis.
export async function GET() {
  const check = [
    "DATABASE_URL", "AUTH_SECRET", "NEXTAUTH_SECRET", "NEXTAUTH_URL",
    "AUTH_TRUST_HOST", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN",
    "OTP_DEV_CODE", "AWS_BUCKET_NAME", "AWS_REGION",
    "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
  ];

  const specific = Object.fromEntries(
    check.map((key) => {
      const val = process.env[key];
      if (!val) return [key, "❌ MISSING"];
      return [key, `✅ (${val.slice(0, 8)}…)`];
    })
  );

  // Check if .env.production.local exists in the Lambda working directory
  const cwd = process.cwd();
  const envFilePath = path.join(cwd, ".env.production.local");
  const envFileExists = fs.existsSync(envFilePath);
  const envFilePreview = envFileExists
    ? fs.readFileSync(envFilePath, "utf8").split("\n").slice(0, 5).join(" | ")
    : "not found";

  return NextResponse.json({
    specific,
    cwd,
    envFile: { path: envFilePath, exists: envFileExists, preview: envFilePreview },
  });
}
