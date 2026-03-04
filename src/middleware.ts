import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
    cookieName: process.env.NODE_ENV === "production"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token",
  });

  const role = token?.role as string | undefined;
  const operatorStatus = token?.operatorStatus as string | undefined;

  // Operator routes
  if (pathname.startsWith("/operator") || pathname.startsWith("/api/operator")) {
    if (!token) {
      return NextResponse.redirect(new URL("/operator-login", req.url));
    }
    if (role !== "OPERATOR") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (
      operatorStatus !== "APPROVED" &&
      !pathname.startsWith("/operator/onboarding") &&
      !pathname.startsWith("/api/operator")
    ) {
      return NextResponse.redirect(new URL("/operator/onboarding", req.url));
    }
  }

  // Driver routes
  if (pathname.startsWith("/driver") || pathname.startsWith("/api/driver")) {
    if (!token) {
      return NextResponse.redirect(new URL("/operator-login", req.url));
    }
    if (role !== "DRIVER") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Admin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/operator-login", req.url));
    }
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Passenger protected routes
  if (pathname.startsWith("/my-trips") || pathname.startsWith("/booking")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/operator/:path*",
    "/driver/:path*",
    "/admin/:path*",
    "/my-trips/:path*",
    "/booking/:path*",
    "/api/operator/:path*",
    "/api/driver/:path*",
    "/api/admin/:path*",
  ],
};
