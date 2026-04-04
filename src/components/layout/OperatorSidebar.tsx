"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { APP_NAME } from "@/constants/config";

type Service = "tickets" | "charter" | "corporate";

const navByService: Record<Service, { href: string; label: string; icon: string }[]> = {
  tickets: [
    { href: "/operator", label: "Dashboard", icon: "📊" },
    { href: "/operator/buses", label: "Buses", icon: "🚌" },
    { href: "/operator/routes", label: "Routes", icon: "🗺️" },
    { href: "/operator/schedules", label: "Schedules", icon: "📅" },
    { href: "/operator/trips", label: "Trips", icon: "🎫" },
    { href: "/operator/drivers", label: "Drivers", icon: "👤" },
    { href: "/operator/fares", label: "Fare Rules", icon: "💲" },
    { href: "/operator/earnings", label: "Earnings", icon: "💰" },
  ],
  charter: [
    { href: "/operator", label: "Dashboard", icon: "📊" },
    { href: "/operator/buses", label: "Fleet", icon: "🚌" },
    { href: "/operator/charter", label: "Bookings", icon: "📋" },
    { href: "/operator/earnings", label: "Earnings", icon: "💰" },
  ],
  corporate: [],
};

const activeNavColors: Record<Service, string> = {
  tickets: "bg-blue-50 text-blue-700",
  charter: "bg-amber-50 text-amber-700",
  corporate: "bg-violet-50 text-violet-700",
};

const pillActive: Record<Service, string> = {
  tickets: "border-blue-500 bg-blue-500 text-white",
  charter: "border-amber-500 bg-amber-500 text-white",
  corporate: "border-violet-500 bg-violet-500 text-white",
};

const pillInactive: Record<Service, string> = {
  tickets: "border-blue-200 text-blue-600 hover:bg-blue-50",
  charter: "border-amber-200 text-amber-600 hover:bg-amber-50",
  corporate: "border-violet-200 text-violet-600 hover:bg-violet-50",
};

const SERVICE_LABELS: Record<Service, string> = {
  tickets: "🎫 Bus Tickets",
  charter: "🚌 Charter",
  corporate: "🏢 Corporate",
};

export function OperatorSidebar() {
  const pathname = usePathname();
  const [service, setService] = useState<Service>("tickets");

  useEffect(() => {
    const stored = localStorage.getItem("operatorService") as Service | null;
    if (stored && ["tickets", "charter", "corporate"].includes(stored)) {
      setService(stored);
    }
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/operator/charter")) {
      setService("charter");
      localStorage.setItem("operatorService", "charter");
    }
  }, [pathname]);

  const handleServiceChange = (s: Service) => {
    setService(s);
    localStorage.setItem("operatorService", s);
  };

  const navItems = navByService[service];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-6 py-4">
        <Link href="/" className="text-lg font-bold text-blue-600">{APP_NAME}</Link>
        <p className="text-xs text-gray-500">Operator Portal</p>
      </div>

      {/* Service switcher */}
      <div className="border-b border-gray-200 px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Service</p>
        <div className="space-y-1.5">
          {(["tickets", "charter", "corporate"] as Service[]).map((s) => {
            const active = service === s;
            return (
              <button
                key={s}
                onClick={() => handleServiceChange(s)}
                className={`w-full rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active ? pillActive[s] : `bg-white ${pillInactive[s]}`
                }`}
              >
                {SERVICE_LABELS[s]}
                {s === "corporate" && !active && (
                  <span className="ml-1.5 rounded bg-violet-100 px-1 py-0.5 text-[10px] text-violet-600">
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
          <div className="rounded-xl border border-violet-100 bg-violet-50 p-4 text-center">
            <p className="mb-1 text-2xl">🏢</p>
            <p className="text-sm font-semibold text-violet-700">Coming Soon</p>
            <p className="mt-1 text-xs text-violet-500">
              Corporate booking management is under development.
            </p>
          </div>
        ) : (
          navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/operator" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? activeNavColors[service]
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })
        )}
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
