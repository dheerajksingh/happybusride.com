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

  // Agent routes (exclude public auth pages)
  const agentPublic = ["/agent/login", "/agent/register"];
  if (pathname.startsWith("/agent") && !agentPublic.includes(pathname)) {
    if (!token) return NextResponse.redirect(new URL("/agent/login", req.url));
    if (role !== "AGENT") return NextResponse.redirect(new URL("/", req.url));
  }

  // Corporate routes (exclude public auth pages and registration API)
  const corporatePublic = ["/corporate/login", "/corporate/register"];
  const corporateApiPublic = ["/api/corporate/register", "/api/corporate/geocode"];
  // Operators may call the employee list endpoint to render the route map
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
    if (!token) {
      return NextResponse.redirect(new URL("/corporate/login", req.url));
    }
    if (role !== "CORPORATE") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Shuttle operator routes (exclude public auth pages)
  const shuttlePublic = ["/shuttle/login", "/shuttle/register"];
  if (pathname.startsWith("/shuttle") && !shuttlePublic.includes(pathname)) {
    if (!token) return NextResponse.redirect(new URL("/shuttle/login", req.url));
    if (role !== "SHUTTLE_OPERATOR") return NextResponse.redirect(new URL("/", req.url));
  }

  // Cab operator routes (exclude public auth pages)
  const cabPublic = ["/cab/login", "/cab/register"];
  if (pathname.startsWith("/cab") && !cabPublic.includes(pathname)) {
    if (!token) return NextResponse.redirect(new URL("/cab/login", req.url));
    if (role !== "CAB_OPERATOR") return NextResponse.redirect(new URL("/", req.url));
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
