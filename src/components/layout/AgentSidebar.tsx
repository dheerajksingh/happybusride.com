"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { APP_NAME } from "@/constants/config";

const NAV = [
  { href: "/agent/dashboard",     label: "Dashboard",    icon: "📊" },
  { href: "/agent/passengers",    label: "Passengers",   icon: "👥" },
  { href: "/agent/bulk-booking",  label: "Bulk Booking", icon: "📋" },
  { href: "/agent/freight",       label: "Freight",      icon: "📦" },
  { href: "/agent/earnings",      label: "Earnings",     icon: "💰" },
  { href: "/agent/operators",     label: "Operators",    icon: "🚌" },
  { href: "/agent/onboarding",    label: "My Profile",   icon: "👤" },
];

export function AgentSidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5 py-4">
        <Link href="/" className="text-base font-black text-orange-600">{APP_NAME}</Link>
        <p className="text-xs text-gray-500">Agent Portal</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== "/agent/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-orange-50 text-orange-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}>
              <span>{item.icon}</span>{item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 px-3 py-4">
        <button onClick={() => signOut({ callbackUrl: "/agent/login" })}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-red-600">
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}
