"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { APP_NAME } from "@/constants/config";

const navItems = [
  { href: "/operator", label: "Dashboard", icon: "📊" },
  { href: "/operator/buses", label: "Buses", icon: "🚌" },
  { href: "/operator/routes", label: "Routes", icon: "🗺️" },
  { href: "/operator/schedules", label: "Schedules", icon: "📅" },
  { href: "/operator/trips", label: "Trips", icon: "🎫" },
  { href: "/operator/drivers", label: "Drivers", icon: "👤" },
  { href: "/operator/fares", label: "Fare Rules", icon: "💲" },
  { href: "/operator/earnings", label: "Earnings", icon: "💰" },
];

export function OperatorSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-6 py-4">
        <Link href="/" className="text-lg font-bold text-blue-600">{APP_NAME}</Link>
        <p className="text-xs text-gray-500">Operator Portal</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/operator" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 px-4 py-4">
        <button
          onClick={() => signOut({ callbackUrl: "/operator-login" })}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-red-600"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}
