"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";

const STATUS_STYLE: Record<string, string> = {
  PENDING_PAYMENT: "bg-gray-100 text-gray-600",
  CONFIRMED:       "bg-blue-100 text-blue-700",
  IN_TRANSIT:      "bg-amber-100 text-amber-700",
  AT_AGENT:        "bg-purple-100 text-purple-700",
  AT_DESTINATION:  "bg-indigo-100 text-indigo-700",
  DELIVERED:       "bg-green-100 text-green-700",
  CANCELLED:       "bg-red-100 text-red-600",
};

const LEG_STYLE: Record<string, string> = {
  ORIGIN:  "bg-blue-100 text-blue-700",
  INTERIM: "bg-amber-100 text-amber-700",
  FINAL:   "bg-green-100 text-green-700",
};

export default function AgentFreightPage() {
  const [data, setData] = useState<{ booked: any[]; handling: any[] }>({ booked: [], handling: [] });
  const [tab, setTab] = useState<"booked" | "handling">("handling");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadData = () => {
    fetch("/api/agent/freight").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  };

  useEffect(() => { loadData(); }, []);

  const updateStatus = async (legId: string, action: string) => {
    setUpdating(legId);
    const res = await fetch(`/api/agent/freight/${legId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      loadData();
    } else {
      const err = await res.json();
      alert(err.error ?? "Failed to update status");
    }
    setUpdating(null);
  };

  if (loading) return <div className="py-12 text-center text-gray-400">Loading…</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Freight</h1>
          <p className="text-sm text-gray-500">Manage cargo you are handling or have booked on behalf of clients</p>
        </div>
        <Link href="/agent/freight/book-walkin"
          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600">
          + Book for Walk-in Customer
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(["handling", "booked"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${tab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "handling" ? `📦 Handling (${data.handling.length})` : `🧾 Booked (${data.booked.length})`}
          </button>
        ))}
      </div>

      {/* Handling tab — freight legs this agent is responsible for */}
      {tab === "handling" && (
        data.handling.length === 0 ? (
          <div className="rounded-xl bg-white border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-3">📦</div>
            <h3 className="font-semibold text-gray-900">No freight to handle</h3>
            <p className="text-sm text-gray-500 mt-1">Freight assigned to you at your city's stops will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.handling.map((leg: any) => (
              <div key={leg.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-gray-900">{leg.booking.fromCity?.name} → {leg.booking.toCity?.name}</div>
                    <div className="text-xs text-gray-400">Ref: {leg.booking.bookingRef?.slice(0,12).toUpperCase()}</div>
                  </div>
                  <div className="flex gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEG_STYLE[leg.transferType]}`}>{leg.transferType}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[leg.status] ?? "bg-gray-100 text-gray-500"}`}>{leg.status.replace(/_/g, " ")}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">Stop: <span className="font-medium">{leg.stop?.city?.name ?? leg.stop?.stopName}</span></div>
                <div className="text-sm text-gray-600">Items: {leg.booking.items?.length ?? 0} item(s)</div>
                {leg.transferType === "FINAL" && leg.holdingDays > 0 && (
                  <div className="mt-2 text-xs text-amber-600">Held {leg.holdingDays} day(s) · charge: ₹{Number(leg.agentCharge).toLocaleString("en-IN")}</div>
                )}
                {/* Status update buttons */}
                <div className="mt-3 flex gap-2">
                  {leg.status === "PENDING" && (
                    <button
                      disabled={updating === leg.id}
                      onClick={() => updateStatus(leg.id, "AGENT_RECEIVED")}
                      className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                      {updating === leg.id ? "Updating…" : "Mark Received"}
                    </button>
                  )}
                  {leg.status === "AGENT_RECEIVED" && leg.transferType !== "FINAL" && (
                    <button
                      disabled={updating === leg.id}
                      onClick={() => updateStatus(leg.id, "LOADED")}
                      className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                      {updating === leg.id ? "Updating…" : "Mark Loaded to Bus"}
                    </button>
                  )}
                  {leg.status === "AGENT_RECEIVED" && leg.transferType === "FINAL" && (
                    <button
                      disabled={updating === leg.id}
                      onClick={() => updateStatus(leg.id, "COLLECTED")}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                      {updating === leg.id ? "Updating…" : "Mark Collected by Recipient"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Booked tab — freight this agent booked on behalf of someone */}
      {tab === "booked" && (
        data.booked.length === 0 ? (
          <div className="rounded-xl bg-white border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-3">🧾</div>
            <h3 className="font-semibold text-gray-900">No freight booked</h3>
            <p className="text-sm text-gray-500 mt-1">Freight bookings you made on behalf of clients appear here.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto shadow-sm">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-400">
                  <th className="px-5 py-3 text-left">Ref</th>
                  <th className="px-5 py-3 text-left">Route</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Recipient</th>
                  <th className="px-5 py-3 text-left">Total</th>
                  <th className="px-5 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.booked.map((fb: any) => (
                  <tr key={fb.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{fb.bookingRef?.slice(0,10).toUpperCase()}</td>
                    <td className="px-5 py-3 font-medium">{fb.fromCity?.name} → {fb.toCity?.name}</td>
                    <td className="px-5 py-3 text-gray-500">{format(new Date(fb.shippingDate), "d MMM yyyy")}</td>
                    <td className="px-5 py-3">{fb.recipientName}</td>
                    <td className="px-5 py-3 font-semibold">₹{Number(fb.totalCost).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[fb.status]}`}>
                        {fb.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
