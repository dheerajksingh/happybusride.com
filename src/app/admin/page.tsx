"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageSpinner } from "@/components/ui/Spinner";

type Service = "tickets" | "charter" | "corporate";

interface AdminDashboardData {
  tickets: {
    totalPassengers: number;
    totalBookings: number;
    monthBookings: number;
    platformRevenue: number;
    activeOperators: number;
    pendingKyc: number;
    pendingRefunds: number;
    openDisputes: number;
  };
  charter: {
    total: number;
    pendingDeposit: number;
    confirmed: number;
    completed: number;
    totalDepositRevenue: number;
  };
}

const SERVICE_TAB_LABELS: Record<Service, string> = {
  tickets: "🎫 Bus Tickets",
  charter: "🚌 Charter",
  corporate: "🏢 Corporate",
};

const TAB_ACTIVE: Record<Service, string> = {
  tickets: "bg-blue-600 text-white",
  charter: "bg-amber-500 text-white",
  corporate: "bg-violet-600 text-white",
};

export default function AdminDashboardPage() {
  const [service, setService] = useState<Service>("tickets");
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("adminService") as Service | null;
    if (stored && ["tickets", "charter", "corporate"].includes(stored)) {
      setService(stored);
    }
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  const handleTabChange = (s: Service) => {
    setService(s);
    localStorage.setItem("adminService", s);
  };

  if (loading) return <PageSpinner />;

  const { tickets, charter } = data ?? { tickets: null, charter: null };

  const alerts = tickets
    ? (
        [
          tickets.pendingKyc > 0 && {
            label: `${tickets.pendingKyc} operator(s) pending approval`,
            href: "/admin/operators?status=PENDING_KYC",
            color: "yellow",
          },
          tickets.pendingRefunds > 0 && {
            label: `${tickets.pendingRefunds} refund(s) awaiting review`,
            href: "/admin/refunds",
            color: "orange",
          },
          tickets.openDisputes > 0 && {
            label: `${tickets.openDisputes} open dispute(s)`,
            href: "/admin/disputes",
            color: "red",
          },
        ] as (false | { label: string; href: string; color: string })[]
      ).filter(Boolean) as { label: string; href: string; color: string }[]
    : [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Admin Dashboard</h1>

      {/* Service Tabs */}
      <div className="mb-6 flex gap-2">
        {(["tickets", "charter", "corporate"] as Service[]).map((s) => (
          <button
            key={s}
            onClick={() => handleTabChange(s)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              service === s ? TAB_ACTIVE[s] : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {SERVICE_TAB_LABELS[s]}
            {s === "corporate" && service !== s && (
              <span className="ml-1.5 rounded bg-violet-900/50 px-1 py-0.5 text-[10px] text-violet-400">
                Soon
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tickets Tab */}
      {service === "tickets" && tickets && (
        <>
          {alerts.length > 0 && (
            <div className="mb-6 space-y-2">
              {alerts.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className={`flex items-center justify-between rounded-lg p-3 text-sm font-medium ${
                    a.color === "red"
                      ? "bg-red-900/50 text-red-300 hover:bg-red-900"
                      : a.color === "orange"
                      ? "bg-orange-900/50 text-orange-300 hover:bg-orange-900"
                      : "bg-yellow-900/50 text-yellow-300 hover:bg-yellow-900"
                  }`}
                >
                  <span>⚠️ {a.label}</span>
                  <span>→</span>
                </Link>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Total Passengers", value: tickets.totalPassengers.toLocaleString(), icon: "👥", href: "/admin/users" },
              { label: "Total Bookings", value: tickets.totalBookings.toLocaleString(), icon: "🎫", href: "/admin/bookings" },
              {
                label: "Platform Revenue",
                value: `₹${tickets.platformRevenue.toLocaleString("en-IN")}`,
                icon: "💰",
                href: "/admin/analytics",
              },
              { label: "Active Operators", value: tickets.activeOperators.toLocaleString(), icon: "🏢", href: "/admin/operators" },
            ].map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="rounded-xl border border-gray-700 bg-gray-800 p-4 shadow-sm hover:border-blue-500"
              >
                <div className="mb-2 text-2xl">{s.icon}</div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-sm text-gray-400">{s.label}</p>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Charter Tab */}
      {service === "charter" && charter && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Total Bookings", value: charter.total.toLocaleString(), icon: "📋", href: "/admin/charter" },
              {
                label: "Pending Deposit",
                value: charter.pendingDeposit.toLocaleString(),
                icon: "⏳",
                href: "/admin/charter?status=PENDING_DEPOSIT",
              },
              {
                label: "Confirmed",
                value: charter.confirmed.toLocaleString(),
                icon: "✅",
                href: "/admin/charter?status=CONFIRMED",
              },
              {
                label: "Deposit Revenue",
                value: `₹${charter.totalDepositRevenue.toLocaleString("en-IN")}`,
                icon: "💰",
                href: "/admin/analytics",
              },
            ].map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="rounded-xl border border-gray-700 bg-gray-800 p-4 shadow-sm hover:border-amber-500"
              >
                <div className="mb-2 text-2xl">{s.icon}</div>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-sm text-gray-400">{s.label}</p>
              </Link>
            ))}
          </div>

          <Link
            href="/admin/charter"
            className="flex items-center justify-between rounded-xl border border-amber-700/50 bg-amber-900/20 p-4 hover:bg-amber-900/30"
          >
            <div>
              <p className="font-semibold text-amber-400">View All Charter Bookings</p>
              <p className="mt-0.5 text-xs text-amber-600">
                Search, filter, and manage charter bookings from all operators
              </p>
            </div>
            <span className="text-amber-400">→</span>
          </Link>
        </>
      )}

      {/* Corporate Tab */}
      {service === "corporate" && (
        <div className="rounded-xl border border-violet-800 bg-violet-900/20 p-12 text-center">
          <p className="mb-3 text-4xl">🏢</p>
          <h2 className="mb-2 text-xl font-bold text-violet-400">Corporate Management</h2>
          <p className="text-sm text-violet-500">
            This module is coming soon. Corporate account management and contract bookings will be
            available here.
          </p>
        </div>
      )}
    </div>
  );
}
