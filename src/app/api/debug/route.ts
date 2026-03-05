import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    OTP_DEV_CODE_SET: !!process.env.OTP_DEV_CODE,
    OTP_DEV_CODE_VALUE: process.env.OTP_DEV_CODE ?? "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
  });
}
