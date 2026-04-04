"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageSpinner } from "@/components/ui/Spinner";

type Service = "tickets" | "charter" | "corporate";

interface TodayTrip {
  id: string;
  fromCity: string;
  toCity: string;
  busName: string;
  departureTime: string;
  bookingCount: number;
  status: string;
}

interface DashboardData {
  tickets: {
    busCount: number;
    routeCount: number;
    driverCount: number;
    monthlyEarnings: number;
    todayTrips: TodayTrip[];
  };
  charter: {
    total: number;
    pendingDeposit: number;
    confirmed: number;
    completed: number;
    revenueThisMonth: number;
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

export default function OperatorDashboardPage() {
  const [service, setService] = useState<Service>("tickets");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("operatorService") as Service | null;
    if (stored && ["tickets", "charter", "corporate"].includes(stored)) {
      setService(stored);
    }
    fetch("/api/operator/dashboard")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, []);

  const handleTabChange = (s: Service) => {
    setService(s);
    localStorage.setItem("operatorService", s);
  };

  if (loading) return <PageSpinner />;

  const { tickets, charter } = data ?? { tickets: null, charter: null };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Service Tabs */}
      <div className="mb-6 flex gap-2">
        {(["tickets", "charter", "corporate"] as Service[]).map((s) => (
          <button
            key={s}
            onClick={() => handleTabChange(s)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              service === s ? TAB_ACTIVE[s] : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {SERVICE_TAB_LABELS[s]}
            {s === "corporate" && service !== s && (
              <span className="ml-1.5 rounded bg-violet-100 px-1 py-0.5 text-[10px] text-violet-600">
                Soon
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tickets Tab */}
      {service === "tickets" && tickets && (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Total Buses", value: tickets.busCount, icon: "🚌" },
              { label: "Active Routes", value: tickets.routeCount, icon: "🗺️" },
              { label: "Drivers", value: tickets.driverCount, icon: "👤" },
              {
                label: "This Month Earnings",
                value: `₹${tickets.monthlyEarnings.toLocaleString("en-IN")}`,
                icon: "💰",
              },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-2 text-2xl">{s.icon}</div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Today&apos;s Trips</h2>
              <Link href="/operator/trips" className="text-sm text-blue-600 hover:underline">
                View All
              </Link>
            </div>
            {tickets.todayTrips.length === 0 ? (
              <p className="text-sm text-gray-400">No trips scheduled for today.</p>
            ) : (
              <div className="space-y-3">
                {tickets.todayTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {trip.fromCity} → {trip.toCity}
                      </p>
                      <p className="text-xs text-gray-500">
                        {trip.busName} ·{" "}
                        {new Date(trip.departureTime).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {trip.bookingCount} bookings
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          trip.status === "IN_PROGRESS"
                            ? "bg-green-100 text-green-700"
                            : trip.status === "BOARDING"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {trip.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Charter Tab */}
      {service === "charter" && charter && (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Total Bookings", value: charter.total, icon: "📋" },
              { label: "Pending Deposit", value: charter.pendingDeposit, icon: "⏳" },
              { label: "Confirmed", value: charter.confirmed, icon: "✅" },
              {
                label: "Revenue This Month",
                value: `₹${charter.revenueThisMonth.toLocaleString("en-IN")}`,
                icon: "💰",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-amber-100 bg-amber-50 p-4 shadow-sm"
              >
                <div className="mb-2 text-2xl">{s.icon}</div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-amber-700">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-amber-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Charter Bookings</h2>
              <Link href="/operator/charter" className="text-sm text-amber-600 hover:underline">
                View All
              </Link>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {charter.confirmed} active charter booking{charter.confirmed !== 1 ? "s" : ""}{" "}
              confirmed.{" "}
              {charter.pendingDeposit > 0 && (
                <span className="text-amber-600">
                  {charter.pendingDeposit} awaiting deposit.
                </span>
              )}
            </p>
          </div>
        </>
      )}

      {/* Corporate Tab */}
      {service === "corporate" && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-12 text-center">
          <p className="mb-3 text-4xl">🏢</p>
          <h2 className="mb-2 text-xl font-bold text-violet-700">Corporate Bookings</h2>
          <p className="text-sm text-violet-600">
            This module is coming soon. Corporate group bookings and contract management will be
            available here.
          </p>
        </div>
      )}
    </div>
  );
}
