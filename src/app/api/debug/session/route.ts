import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  const session = await auth();
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get("__Secure-authjs.session-token") ??
    cookieStore.get("authjs.session-token");

  return NextResponse.json({
    session,
    hasCookie: !!sessionCookie,
    cookieName: sessionCookie?.name ?? null,
    nodeEnv: process.env.NODE_ENV,
    hasAuthSecret: !!process.env.AUTH_SECRET,
  });
}
