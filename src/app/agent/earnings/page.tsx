"use client";
import { useEffect, useState } from "react";
import { PageSpinner } from "@/components/ui/Spinner";

const TYPE_LABELS: Record<string, string> = {
  SEAT_COMMISSION:           "Seat Commission",
  FREIGHT_COMMISSION:        "Freight Commission",
  FREIGHT_HANDLING_ORIGIN:   "Handling — Origin",
  FREIGHT_HANDLING_INTERIM:  "Handling — Interim",
  FREIGHT_HANDLING_FINAL:    "Handling — Final",
};

const TYPE_COLOR: Record<string, string> = {
  SEAT_COMMISSION:           "bg-blue-100 text-blue-700",
  FREIGHT_COMMISSION:        "bg-amber-100 text-amber-700",
  FREIGHT_HANDLING_ORIGIN:   "bg-purple-100 text-purple-700",
  FREIGHT_HANDLING_INTERIM:  "bg-orange-100 text-orange-700",
  FREIGHT_HANDLING_FINAL:    "bg-green-100 text-green-700",
};

export default function AgentEarningsPage() {
  const [data, setData] = useState<any>(null);
  const [view, setView] = useState<"monthly" | "daily">("monthly");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/agent/earnings?view=${view}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [view]);

  if (loading) return <PageSpinner />;

  const totalEarned = Number(data?.totals?._sum?.amount ?? 0);
  const byType: { type: string; _sum: { amount: string }; _count: number }[] = data?.byType ?? [];
  const periods: { label: string; total: number; byType: Record<string, number> }[] = data?.periods ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Earnings</h1>
          <p className="text-sm text-gray-500">All commissions and handling fees earned</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {(["monthly", "daily"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors capitalize ${view === v ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-green-50 p-5">
          <p className="text-sm text-green-700 font-medium">Total Earned</p>
          <p className="text-3xl font-black text-green-800">₹{totalEarned.toLocaleString("en-IN")}</p>
          <p className="text-xs text-green-600 mt-1">{data?.totals?._count ?? 0} transactions</p>
        </div>
        {byType.map(bt => (
          <div key={bt.type} className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">{TYPE_LABELS[bt.type] ?? bt.type}</p>
            <p className="text-2xl font-bold text-gray-900">₹{Number(bt._sum.amount).toLocaleString("en-IN")}</p>
            <p className="text-xs text-gray-400 mt-1">{bt._count} transaction{bt._count !== 1 ? "s" : ""}</p>
          </div>
        ))}
      </div>

      {/* Period breakdown */}
      {periods.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="text-4xl mb-3">💰</div>
          <h3 className="font-semibold text-gray-900">No earnings yet</h3>
          <p className="text-sm text-gray-500 mt-1">Your commissions and handling fees will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((p, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-gray-900">{p.label}</span>
                <span className="text-lg font-black text-green-700">₹{p.total.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(p.byType).map(([type, amt]) => (
                  <span key={type} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLOR[type] ?? "bg-gray-100 text-gray-600"}`}>
                    {TYPE_LABELS[type] ?? type}: ₹{Number(amt).toLocaleString("en-IN")}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
