"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { APP_NAME } from "@/constants/config";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/operators", label: "Operators", icon: "🏢" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/bookings", label: "Bookings", icon: "🎫" },
  { href: "/admin/disputes", label: "Disputes", icon: "⚠️" },
  { href: "/admin/refunds", label: "Refunds", icon: "💸" },
  { href: "/admin/pricing", label: "Pricing & Commission", icon: "⚙️" },
  { href: "/admin/analytics", label: "Analytics", icon: "📈" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-gray-900">
      <div className="border-b border-gray-700 px-6 py-4">
        <Link href="/" className="text-lg font-bold text-white">{APP_NAME}</Link>
        <p className="text-xs text-gray-400">Admin Panel</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-700 px-4 py-4">
        <button
          onClick={() => signOut({ callbackUrl: "/operator-login" })}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-red-400"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}
