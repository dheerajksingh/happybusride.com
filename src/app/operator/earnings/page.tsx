"use client";

import { useEffect, useState } from "react";
import { PageSpinner } from "@/components/ui/Spinner";

export default function EarningsPage() {
  const [data, setData] = useState<any>(null);
  const [view, setView] = useState<"monthly" | "daily">("monthly");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/operator/earnings?view=${view}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [view]);

  if (loading) return <PageSpinner />;

  const { summary = {}, buses = [] } = data ?? {};

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
          {(["monthly", "daily"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
                view === v ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Passenger Gross", value: summary.passengerGross ?? 0, color: "bg-blue-50 text-blue-700" },
          { label: "Freight Earnings", value: summary.freightEarnings ?? 0, color: "bg-amber-50 text-amber-700" },
          { label: "Passenger Net", value: summary.passengerNet ?? 0, color: "bg-green-50 text-green-700" },
          { label: "Total Net Payout", value: summary.totalNet ?? 0, color: "bg-purple-50 text-purple-700" },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl p-4 ${card.color}`}>
            <p className="text-xs font-medium opacity-70">{card.label}</p>
            <p className="text-xl font-bold">₹{Number(card.value).toLocaleString("en-IN")}</p>
          </div>
        ))}
      </div>

      {/* Per-bus accordion */}
      {buses.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm text-gray-400">
          No earnings data yet.
        </div>
      ) : (
        <div className="space-y-3">
          {buses.map((bus: any) => (
            <div key={bus.busId} className="overflow-hidden rounded-xl bg-white shadow-sm">
              <button
                onClick={() => setExpanded(expanded === bus.busId ? null : bus.busId)}
                className="flex w-full items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="text-left">
                  <div className="font-semibold text-gray-900">{bus.busName}</div>
                  <div className="text-xs text-gray-400">
                    Net: ₹{bus.passengerNet.toLocaleString("en-IN")} passenger + ₹{bus.freightEarnings.toLocaleString("en-IN")} freight
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      ₹{(bus.passengerGross + bus.freightEarnings).toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs text-gray-400">total gross</div>
                  </div>
                  <span className="text-gray-400">{expanded === bus.busId ? "▲" : "▼"}</span>
                </div>
              </button>

              {expanded === bus.busId && (
                <div className="border-t border-gray-100 px-5 pb-4">
                  <p className="mt-3 mb-2 text-xs font-semibold uppercase text-gray-400">
                    {view === "monthly" ? "Monthly" : "Daily"} Breakdown
                  </p>
                  {bus.periods.length === 0 ? (
                    <p className="text-sm text-gray-400">No period data.</p>
                  ) : (
                    <div className="space-y-1">
                      <div className="grid grid-cols-3 text-xs font-semibold text-gray-400 pb-1 border-b border-gray-100">
                        <span>Period</span>
                        <span className="text-right">Passenger Gross</span>
                        <span className="text-right">Freight Earnings</span>
                      </div>
                      {bus.periods.map((p: any, i: number) => (
                        <div key={i} className="grid grid-cols-3 text-sm py-1 border-b border-gray-50 last:border-0">
                          <span className="text-gray-600">{p.label}</span>
                          <span className="text-right text-blue-600">₹{p.passengerGross.toLocaleString("en-IN")}</span>
                          <span className="text-right text-amber-600">₹{p.freightEarnings.toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
