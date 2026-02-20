"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { APP_NAME } from "@/constants/config";

export function PassengerHeader() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-blue-600">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 5H3a2 2 0 00-2 2v9a1 1 0 001 1h1a2 2 0 004 0h8a2 2 0 004 0h1a1 1 0 001-1V9l-4-4zM3 11V7h10v4H3zm12 1.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm-12 0a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm12-5.5V7l2.55 4H15V7z" />
          </svg>
          {APP_NAME}
        </Link>

        <nav className="flex items-center gap-4">
          {session ? (
            <>
              <Link href="/my-trips" className="text-sm font-medium text-gray-600 hover:text-blue-600">
                My Trips
              </Link>
              <Link href="/wallet" className="text-sm font-medium text-gray-600 hover:text-blue-600">
                Wallet
              </Link>
              <Link href="/profile" className="text-sm font-medium text-gray-600 hover:text-blue-600">
                Profile
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm font-medium text-gray-500 hover:text-red-600"
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
        </nav>
      </div>
    </header>
  );
}
