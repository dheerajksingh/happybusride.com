import { NextResponse } from "next/server";

export async function GET() {
  const allKeys = Object.keys(process.env).filter(k =>
    !k.includes("SECRET") && !k.includes("PASSWORD") && !k.includes("KEY") && !k.includes("TOKEN")
  ).sort();

  return NextResponse.json({
    OTP_DEV_CODE_SET: !!process.env.OTP_DEV_CODE,
    OTP_DEV_CODE_VALUE: process.env.OTP_DEV_CODE ?? "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
    ALL_ENV_KEYS: allKeys,
  });
}
