"use client";

import { useEffect, useState } from "react";
import { PageSpinner } from "@/components/ui/Spinner";

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((s) => { setStats(s); setLoading(false); });
  }, []);

  if (loading) return <PageSpinner />;

  const cards = [
    { label: "Total Passengers", value: stats?.totalUsers?.toLocaleString() ?? "0", color: "text-blue-400" },
    { label: "Total Bookings", value: stats?.totalBookings?.toLocaleString() ?? "0", color: "text-green-400" },
    { label: "This Month Bookings", value: stats?.monthBookings?.toLocaleString() ?? "0", color: "text-purple-400" },
    { label: "Platform Revenue (All Time)", value: `₹${Number(stats?.platformRevenue ?? 0).toLocaleString("en-IN")}`, color: "text-yellow-400" },
    { label: "Platform Revenue (This Month)", value: `₹${Number(stats?.monthRevenue ?? 0).toLocaleString("en-IN")}`, color: "text-orange-400" },
    { label: "Active Operators", value: stats?.activeOperators?.toLocaleString() ?? "0", color: "text-teal-400" },
    { label: "Pending Operators", value: stats?.pendingOperators?.toLocaleString() ?? "0", color: "text-yellow-400" },
    { label: "Pending Refunds", value: stats?.pendingRefunds?.toLocaleString() ?? "0", color: "text-red-400" },
    { label: "Open Disputes", value: stats?.openDisputes?.toLocaleString() ?? "0", color: "text-red-400" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Platform Analytics</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl bg-gray-800 p-5">
            <p className="mb-1 text-sm text-gray-400">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl bg-gray-800 p-6 text-center text-gray-500">
        <p className="text-4xl mb-2">📊</p>
        <p className="text-sm">Charts coming soon — upgrade to Recharts integration for booking trends</p>
      </div>
    </div>
  );
}
