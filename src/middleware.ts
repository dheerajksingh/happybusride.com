import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role;
  const operatorStatus = session?.user?.operatorStatus;

  // Operator routes
  if (pathname.startsWith("/operator") || pathname.startsWith("/api/operator")) {
    if (!session) {
      return NextResponse.redirect(new URL("/operator-login", req.url));
    }
    if (role !== "OPERATOR") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    // Redirect to onboarding if not approved (except onboarding routes)
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
    if (!session) {
      return NextResponse.redirect(new URL("/operator-login", req.url));
    }
    if (role !== "DRIVER") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Admin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/operator-login", req.url));
    }
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Passenger protected routes
  if (pathname.startsWith("/my-trips") || pathname.startsWith("/booking")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
});

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
