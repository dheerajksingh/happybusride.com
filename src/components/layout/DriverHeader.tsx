"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { APP_NAME } from "@/constants/config";

export function DriverHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="border-b border-gray-700 bg-gray-800">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-lg font-bold text-blue-400">{APP_NAME}</p>
          <p className="text-xs text-gray-500">Driver App</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/driver"
            className={`text-sm font-medium ${pathname === "/driver" ? "text-blue-400" : "text-gray-400 hover:text-white"}`}
          >
            Trips
          </Link>
          <Link
            href="/driver/attendance"
            className={`text-sm font-medium ${pathname === "/driver/attendance" ? "text-blue-400" : "text-gray-400 hover:text-white"}`}
          >
            Attendance
          </Link>
          <span className="text-sm text-gray-400">{session?.user?.name}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/operator-login" })}
            className="text-sm text-gray-400 hover:text-red-400"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
