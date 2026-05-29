"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

interface FreightOption {
  type: "DIRECT" | "ONE_HOP";
  legs: {
    tripId: string; scheduleId: string; busName: string;
    fromCityName: string; fromStopName: string;
    toCityName: string; toStopName: string;
    fromStopId: string; toStopId: string;
    departureTime: string; distanceKm: number;
  }[];
  transfers: { cityName: string; agentId: string; agentName: string; agentPhone: string; agentCharge: number }[];
  freightCost: number;
  agentCost: number;
  totalCost: number;
  availableKg: number;
}

function ResultsContent() {
  const params  = useSearchParams();
  const router  = useRouter();
  const [options, setOptions]         = useState<FreightOption[]>([]);
  const [availDates, setAvailDates]   = useState<string[]>([]);
  const [loading, setLoading]         = useState(true);

  const fromId   = params.get("from")     ?? "";
  const toId     = params.get("to")       ?? "";
  const fromName = params.get("fromName") ?? "";
  const toName   = params.get("toName")   ?? "";
  const date     = params.get("date")     ?? "";
  const weight   = params.get("weight")   ?? "0";
  const length   = params.get("length")   ?? "0";
  const breadth  = params.get("breadth")  ?? "0";
  const height   = params.get("height")   ?? "0";

  useEffect(() => {
    const q = new URLSearchParams({ from: fromId, to: toId, date, weight, length, breadth, height });
    fetch(`/api/freight/search?${q}`).then(r => r.json()).then(d => {
      setOptions(d.options ?? []);
      setAvailDates(d.availableDates ?? []);
      setLoading(false);
    });
  }, []);

  function selectOption(opt: FreightOption) {
    sessionStorage.setItem("freightOption", JSON.stringify(opt));
    sessionStorage.setItem("freightSearch", JSON.stringify({ fromId, toId, fromName, toName, date, weight, length, breadth, height }));
    router.push("/freight/book");
  }

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center"><div className="text-4xl mb-3 animate-bounce">📦</div><p className="text-gray-500">Searching routes…</p></div>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link href="/freight" className="text-sm text-amber-600 hover:underline">← New search</Link>
        <h1 className="mt-2 text-xl font-bold text-gray-900">{fromName} → {toName}</h1>
        <p className="text-sm text-gray-500">{format(new Date(date), "d MMMM yyyy")} · {weight} kg · {length}×{breadth}×{height} cm</p>
      </div>

      {options.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <div className="text-4xl mb-3">😔</div>
          <h3 className="font-semibold text-gray-900">No shipping available on this date</h3>
          {availDates.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-3">Shipping is available on:</p>
              <div className="flex justify-center gap-3 flex-wrap">
                {availDates.map(d => (
                  <Link key={d} href={`/freight/results?${new URLSearchParams({ ...Object.fromEntries(params), date: d })}`}
                    className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-200">
                    {format(new Date(d), "d MMM yyyy")}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {availDates.length === 0 && (
            <p className="mt-2 text-sm text-gray-400">No shipping found on this route in the next 7 days. Try a different route.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {options.map((opt, idx) => (
            <div key={idx} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${opt.type === "DIRECT" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                      {opt.type === "DIRECT" ? "Direct" : "Via transfer"}
                    </span>
                    <div className="mt-1 text-xs text-gray-400">Up to {opt.availableKg} kg space available</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-gray-900">₹{opt.totalCost.toLocaleString("en-IN")}</div>
                    {opt.agentCost > 0 && (
                      <div className="text-xs text-gray-400">incl. ₹{opt.agentCost} agent charges</div>
                    )}
                  </div>
                </div>

                {/* Journey chain */}
                <div className="space-y-2">
                  {opt.legs.map((leg, li) => (
                    <div key={li}>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">{li + 1}</div>
                        <div>
                          <span className="font-medium">{leg.fromCityName}</span>
                          <span className="text-gray-400 mx-1">→</span>
                          <span className="font-medium">{leg.toCityName}</span>
                        </div>
                        <div className="ml-auto text-xs text-gray-400">{leg.busName} · {leg.distanceKm} km</div>
                      </div>
                      {/* Transfer info between legs */}
                      {li < opt.legs.length - 1 && opt.transfers[li] && (
                        <div className="ml-9 mt-1 rounded-lg bg-amber-50 border border-amber-100 px-3 py-1.5 text-xs text-amber-700">
                          🤝 Transfer at <strong>{opt.transfers[li].cityName}</strong> via agent {opt.transfers[li].agentName} ({opt.transfers[li].agentPhone})
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Final agent (FINAL stop) */}
                {opt.transfers.length > 0 && (
                  <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-600">
                    📍 Recipient collects from agent at destination
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  Freight: ₹{opt.freightCost.toLocaleString("en-IN")}
                  {opt.agentCost > 0 && ` + Agent: ₹${opt.agentCost.toLocaleString("en-IN")}`}
                </div>
                <button onClick={() => selectOption(opt)}
                  className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-bold text-white hover:bg-amber-600">
                  Book This →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FreightResultsPage() {
  return <Suspense fallback={<div className="py-12 text-center text-gray-400">Loading…</div>}><ResultsContent /></Suspense>;
}
