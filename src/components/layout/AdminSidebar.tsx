"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { APP_NAME } from "@/constants/config";

type Service = "tickets" | "charter" | "corporate";

const navByService: Record<Service, { href: string; label: string; icon: string }[]> = {
  tickets: [
    { href: "/admin", label: "Dashboard", icon: "📊" },
    { href: "/admin/operators", label: "Operators", icon: "🏢" },
    { href: "/admin/users", label: "Users", icon: "👥" },
    { href: "/admin/bookings", label: "Bookings", icon: "🎫" },
    { href: "/admin/disputes", label: "Disputes", icon: "⚠️" },
    { href: "/admin/refunds", label: "Refunds", icon: "💸" },
    { href: "/admin/pricing", label: "Pricing & Commission", icon: "⚙️" },
    { href: "/admin/analytics", label: "Analytics", icon: "📈" },
    { href: "/admin/cache", label: "Cache Management", icon: "🗄️" },
  ],
  charter: [
    { href: "/admin", label: "Dashboard", icon: "📊" },
    { href: "/admin/charter", label: "Charter Bookings", icon: "🚌" },
    { href: "/admin/operators", label: "Operators", icon: "🏢" },
    { href: "/admin/analytics", label: "Revenue", icon: "📈" },
  ],
  corporate: [],
};

const pillActive: Record<Service, string> = {
  tickets: "border-blue-500 bg-blue-600 text-white",
  charter: "border-amber-500 bg-amber-600 text-white",
  corporate: "border-violet-500 bg-violet-600 text-white",
};

const activeNavColors: Record<Service, string> = {
  tickets: "bg-blue-600 text-white",
  charter: "bg-amber-600/20 text-amber-400",
  corporate: "bg-violet-600/20 text-violet-400",
};

const SERVICE_LABELS: Record<Service, string> = {
  tickets: "🎫 Bus Tickets",
  charter: "🚌 Charter",
  corporate: "🏢 Corporate",
};

export function AdminSidebar() {
  const pathname = usePathname();
  const [service, setService] = useState<Service>("tickets");

  useEffect(() => {
    const stored = localStorage.getItem("adminService") as Service | null;
    if (stored && ["tickets", "charter", "corporate"].includes(stored)) {
      setService(stored);
    }
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/admin/charter")) {
      setService("charter");
      localStorage.setItem("adminService", "charter");
    }
  }, [pathname]);

  const handleServiceChange = (s: Service) => {
    setService(s);
    localStorage.setItem("adminService", s);
  };

  const navItems = navByService[service];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-700 bg-gray-900">
      <div className="border-b border-gray-700 px-6 py-4">
        <Link href="/" className="text-lg font-bold text-white">{APP_NAME}</Link>
        <p className="text-xs text-gray-400">Admin Panel</p>
      </div>

      {/* Service switcher */}
      <div className="border-b border-gray-700 px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Service</p>
        <div className="space-y-1.5">
          {(["tickets", "charter", "corporate"] as Service[]).map((s) => {
            const active = service === s;
            return (
              <button
                key={s}
                onClick={() => handleServiceChange(s)}
                className={`w-full rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? pillActive[s]
                    : "border-gray-600 bg-transparent text-gray-300 hover:bg-gray-800"
                }`}
              >
                {SERVICE_LABELS[s]}
                {s === "corporate" && !active && (
                  <span className="ml-1.5 rounded bg-violet-900/50 px-1 py-0.5 text-[10px] text-violet-400">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4">
        {service === "corporate" ? (
          <div className="rounded-xl border border-violet-800 bg-violet-900/20 p-4 text-center">
            <p className="mb-1 text-2xl">🏢</p>
            <p className="text-sm font-semibold text-violet-400">Coming Soon</p>
            <p className="mt-1 text-xs text-violet-500">
              Corporate management is under development.
            </p>
          </div>
        ) : (
          navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? activeNavColors[service]
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })
        )}
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
