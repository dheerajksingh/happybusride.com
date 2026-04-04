"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { APP_NAME } from "@/constants/config";

const SERVICE_NAV = [
  { href: "/", label: "Bus Tickets", match: (p: string) => p === "/" || p.startsWith("/search") || p.startsWith("/buses") },
  { href: "/charter", label: "Charter", match: (p: string) => p.startsWith("/charter") },
  { href: "/#corporate", label: "Corporate", match: () => false },
];

interface PassengerHeaderProps {
  activeService?: string;
}

export function PassengerHeader({ activeService }: PassengerHeaderProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  function isServiceActive(href: string, match: (p: string) => boolean) {
    if (activeService) {
      if (href === "/" && activeService === "tickets") return true;
      if (href === "/charter" && activeService === "charter") return true;
      if (href === "/#corporate" && activeService === "corporate") return true;
    }
    return match(pathname);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-blue-600">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 5H3a2 2 0 00-2 2v9a1 1 0 001 1h1a2 2 0 004 0h8a2 2 0 004 0h1a1 1 0 001-1V9l-4-4zM3 11V7h10v4H3zm12 1.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-12 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm12-5.5V7l2.55 4H15V7z" />
          </svg>
          {APP_NAME}
        </Link>

        {/* Service nav — visible to everyone */}
        <nav className="hidden items-center gap-1 sm:flex">
          {SERVICE_NAV.map((s) => {
            const active = isServiceActive(s.href, s.match);
            const isCorporate = s.href === "/#corporate";
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {s.label}
                {isCorporate && (
                  <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 leading-none">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Auth actions */}
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link href="/my-trips" className="hidden text-sm font-medium text-gray-600 hover:text-blue-600 sm:block">
                My Trips
              </Link>
              <Link href="/wallet" className="hidden text-sm font-medium text-gray-600 hover:text-blue-600 sm:block">
                Wallet
              </Link>
              <Link
                href="/profile"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 hover:bg-blue-200"
                title="Profile"
              >
                {(session.user?.name?.[0] ?? session.user?.email?.[0] ?? "U").toUpperCase()}
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="hidden text-sm font-medium text-gray-400 hover:text-red-600 sm:block"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
