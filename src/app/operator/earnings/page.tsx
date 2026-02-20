"use client";

import { useEffect, useState } from "react";
import { PageSpinner } from "@/components/ui/Spinner";

export default function EarningsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/operator/earnings")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <PageSpinner />;

  const { earnings = [], totals } = data ?? {};
  const totalGross = Number(totals?._sum?.grossAmount ?? 0);
  const totalNet = Number(totals?._sum?.netPayout ?? 0);
  const totalCommission = Number(totals?._sum?.commissionAmt ?? 0);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Earnings</h1>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Gross Revenue", value: `₹${totalGross.toLocaleString("en-IN")}`, color: "bg-blue-50 text-blue-700" },
          { label: "Platform Commission", value: `₹${totalCommission.toLocaleString("en-IN")}`, color: "bg-orange-50 text-orange-700" },
          { label: "Net Payout to You", value: `₹${totalNet.toLocaleString("en-IN")}`, color: "bg-green-50 text-green-700" },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl p-4 ${card.color}`}>
            <p className="text-sm font-medium opacity-70">{card.label}</p>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Earnings Table */}
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Gross</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Net Payout</th>
            </tr>
          </thead>
          <tbody>
            {earnings.length === 0 && (
              <tr><td colSpan={5} className="py-12 text-center text-gray-400">No earnings yet</td></tr>
            )}
            {earnings.map((e: any) => (
              <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">
                  {new Date(e.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600">{e.bookingId.slice(-8)}</td>
                <td className="px-4 py-3 text-gray-900">₹{Number(e.grossAmount).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 text-red-600">−₹{Number(e.commissionAmt).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 font-semibold text-green-600">₹{Number(e.netPayout).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
