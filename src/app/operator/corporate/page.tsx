"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { useMapData } from "@/components/corporate/useMapData";

const CorporateMap = dynamic(() => import("@/components/corporate/CorporateMap"), { ssr: false });

interface CorporateRequest {
  id: string;
  city: string;
  state: string;
  status: string;
  arrivalTime: string;
  departureTime: string;
  startDate: string;
  hasAc: boolean;
  hasWifi: boolean;
  seatCapacityMin: number | null;
  busType: string | null;
  notes: string | null;
  officeAddress: string;
  officeLat?: number | null;
  officeLng?: number | null;
  company: { name: string; city: string; state: string };
  _count: { employees: number };
  bids: { id: string; status: string; quoteAmount: string | null }[];
  employees?: { id: string; name: string; address: string; latitude?: number | null; longitude?: number | null }[];
}

function RequestMap({ req }: { req: CorporateRequest }) {
  const { status, office, employees: mapEmployees, skipped, load } = useMapData();

  async function fetchEmployeesAndLoad() {
    const res = await fetch(`/api/corporate/requests/${req.id}/employees`);
    if (!res.ok) return;
    const data = await res.json();
    load({ ...req, officeAddress: req.officeAddress ?? req.city, employees: data.employees ?? [] });
  }

  if (status === "idle") {
    return (
      <button
        onClick={fetchEmployeesAndLoad}
        className="mt-3 flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100"
      >
        🗺️ View Route Map
      </button>
    );
  }

  if (status === "loading") {
    return <p className="mt-3 text-xs text-gray-400 animate-pulse">Geocoding addresses…</p>;
  }

  if (status === "error" || !office) {
    return <p className="mt-3 text-xs text-red-400">Could not load map — address not geocodable.</p>;
  }

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex flex-wrap gap-3 text-xs text-gray-400">
        <span>🏢 Office &nbsp; 👤 Employee &nbsp; 🚌 Pickup stop</span>
        {skipped > 0 && <span className="text-amber-500">{skipped} address{skipped > 1 ? "es" : ""} not geocoded</span>}
      </div>
      <CorporateMap key="operator-cluster" office={office} employees={mapEmployees} height="300px" />
      <p className="mt-1 text-xs text-gray-400">{mapEmployees.length} employees · stops clustered within ~1.5 km · routes are indicative</p>
    </div>
  );
}

export default function OperatorCorporatePage() {
  const [requests, setRequests] = useState<CorporateRequest[]>([]);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [quoting, setQuoting] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState({ amount: "", note: "" });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const res = await fetch("/api/operator/corporate");
    if (res.ok) {
      const data = await res.json();
      setRequests(data.requests);
      setOperatorId(data.operatorId);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function submitBid(requestId: string) {
    if (!quoteForm.amount) return;
    setSubmitting(true);
    await fetch("/api/operator/corporate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId,
        quoteAmount: parseFloat(quoteForm.amount),
        quoteNote: quoteForm.note || undefined,
      }),
    });
    setQuoteForm({ amount: "", note: "" });
    setQuoting(null);
    await load();
    setSubmitting(false);
  }

  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Loading…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Corporate Charter Requests</h1>
        <p className="mt-1 text-sm text-gray-500">
          Employee commute requests from companies in your area. Submit quotes to win contracts.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="mb-3 text-4xl">🏢</p>
          <h3 className="font-semibold text-gray-900">No corporate requests yet</h3>
          <p className="mt-1 text-sm text-gray-500">Corporate charter requests from companies in your area will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const myBid = req.bids.find((b) => b.status !== "WITHDRAWN");
            return (
              <div key={req.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900">{req.company.name}</h3>
                    <p className="text-sm text-gray-500">{req.city}, {req.state}</p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${req.status === "SUBMITTED" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {req.status}
                    </span>
                    {myBid && (
                      <p className="mt-1 text-xs text-gray-400">
                        Your bid: ₹{Number(myBid.quoteAmount).toLocaleString()} —{" "}
                        <span className={myBid.status === "ACCEPTED" ? "text-green-600 font-semibold" : "text-gray-500"}>
                          {myBid.status}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-sm mb-3">
                  <div className="rounded-lg bg-gray-50 p-2">
                    <p className="text-xs text-gray-400">Employees</p>
                    <p className="font-bold text-gray-800">{req._count.employees}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2">
                    <p className="text-xs text-gray-400">Timing</p>
                    <p className="font-bold text-gray-800">{req.arrivalTime} / {req.departureTime}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2">
                    <p className="text-xs text-gray-400">Start Date</p>
                    <p className="font-bold text-gray-800">{format(new Date(req.startDate), "d MMM yy")}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2">
                    <p className="text-xs text-gray-400">Bus Type</p>
                    <p className="font-bold text-gray-800">{req.busType?.replace(/_/g, " ") ?? "Any"}</p>
                  </div>
                </div>

                {(req.hasAc || req.hasWifi || req.seatCapacityMin) && (
                  <div className="flex gap-2 mb-3">
                    {req.hasAc && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">AC Required</span>}
                    {req.hasWifi && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">WiFi Required</span>}
                    {req.seatCapacityMin && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Min {req.seatCapacityMin} seats</span>}
                  </div>
                )}

                {req.notes && <p className="text-sm text-gray-500 mb-3">"{req.notes}"</p>}

                {/* Route map */}
                <RequestMap req={req} />

                {!myBid && quoting !== req.id && (
                  <button
                    onClick={() => setQuoting(req.id)}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                  >
                    Submit Quote
                  </button>
                )}

                {quoting === req.id && (
                  <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 space-y-3">
                    <p className="text-sm font-semibold text-violet-800">Submit Your Quote</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Monthly Amount (₹) *</label>
                        <input
                          type="number"
                          value={quoteForm.amount}
                          onChange={(e) => setQuoteForm((f) => ({ ...f, amount: e.target.value }))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          placeholder="e.g. 85000"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">Note to Company</label>
                      <textarea
                        value={quoteForm.note}
                        onChange={(e) => setQuoteForm((f) => ({ ...f, note: e.target.value }))}
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Describe what's included, bus details, terms…"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => submitBid(req.id)}
                        disabled={!quoteForm.amount || submitting}
                        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        {submitting ? "Submitting…" : "Submit Quote"}
                      </button>
                      <button
                        onClick={() => { setQuoting(null); setQuoteForm({ amount: "", note: "" }); }}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
