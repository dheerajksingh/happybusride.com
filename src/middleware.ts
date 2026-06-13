import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const role = session?.user?.role as string | undefined;
  const operatorStatus = session?.user?.operatorStatus as string | undefined;

  // Operator routes
  if (pathname.startsWith("/operator") || pathname.startsWith("/api/operator")) {
    if (!session) return NextResponse.redirect(new URL("/operator-login", req.url));
    if (role !== "OPERATOR") return NextResponse.redirect(new URL("/", req.url));
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
    if (!session) return NextResponse.redirect(new URL("/operator-login", req.url));
    if (role !== "DRIVER") return NextResponse.redirect(new URL("/", req.url));
  }

  // Admin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!session) return NextResponse.redirect(new URL("/operator-login", req.url));
    if (role !== "ADMIN") return NextResponse.redirect(new URL("/", req.url));
  }

  // Agent routes (exclude public auth pages)
  const agentPublic = ["/agent/login", "/agent/register"];
  if (pathname.startsWith("/agent") && !agentPublic.includes(pathname)) {
    if (!session) return NextResponse.redirect(new URL("/agent/login", req.url));
    if (role !== "AGENT") return NextResponse.redirect(new URL("/", req.url));
  }

  // Corporate routes
  const corporatePublic = ["/corporate/login", "/corporate/register"];
  const corporateApiPublic = ["/api/corporate/register", "/api/corporate/geocode"];
  const corporateApiOperatorAllowed = (p: string) =>
    role === "OPERATOR" && (
      /^\/api\/corporate\/requests\/[^/]+\/employees$/.test(p) ||
      /^\/api\/corporate\/requests\/[^/]+\/routes$/.test(p)
    );

  if (
    (pathname.startsWith("/corporate") && !corporatePublic.includes(pathname)) ||
    (pathname.startsWith("/api/corporate") &&
      !corporateApiPublic.includes(pathname) &&
      !corporateApiOperatorAllowed(pathname))
  ) {
    if (!session) return NextResponse.redirect(new URL("/corporate/login", req.url));
    if (role !== "CORPORATE") return NextResponse.redirect(new URL("/", req.url));
  }

  // Shuttle routes
  const shuttlePublic = ["/shuttle/login", "/shuttle/register"];
  if (pathname.startsWith("/shuttle") && !shuttlePublic.includes(pathname)) {
    if (!session) return NextResponse.redirect(new URL("/shuttle/login", req.url));
    if (role !== "SHUTTLE_OPERATOR") return NextResponse.redirect(new URL("/", req.url));
  }

  // Cab routes
  const cabPublic = ["/cab/login", "/cab/register"];
  if (pathname.startsWith("/cab") && !cabPublic.includes(pathname)) {
    if (!session) return NextResponse.redirect(new URL("/cab/login", req.url));
    if (role !== "CAB_OPERATOR") return NextResponse.redirect(new URL("/", req.url));
  }

  // Passenger protected routes
  if (pathname.startsWith("/my-trips") || pathname.startsWith("/booking")) {
    if (!session) return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/operator/:path*",
    "/driver/:path*",
    "/admin/:path*",
    "/corporate/:path*",
    "/agent/:path*",
    "/shuttle/:path*",
    "/cab/:path*",
    "/my-trips/:path*",
    "/booking/:path*",
    "/api/operator/:path*",
    "/api/driver/:path*",
    "/api/admin/:path*",
    "/api/corporate/:path*",
  ],
};
