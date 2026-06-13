"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { PageSpinner } from "@/components/ui/Spinner";
import { BusCard } from "@/components/passenger/BusCard";

interface SearchResult {
  scheduleId: string;
  tripId: string | null;
  route: {
    from: string;
    to: string;
    fromStopName: string | null;
    toStopName: string | null;
    durationMins: number | null;
    distanceKm: number | null;
    stops: { stopName: string; city: { name: string } }[];
  };
  bus: {
    id: string;
    name: string;
    busType: string;
    totalSeats: number;
    amenities: string[];
  };
  departureTime: string;
  arrivalTime: string;
  baseFare: number;
  fareRules: { seatType: string; price: number }[];
  availableSeats: number;
}

interface ConnectingOption {
  transferCity: string;
  transferCityId: string;
  transferWaitMins: number;
  leg1: {
    scheduleId: string;
    tripId: string;
    busName: string;
    busType: string;
    fromCity: string;
    toCity: string;
    departureTime: string;
    arrivalTime: string;
    baseFare: number;
    availableSeats: number;
  };
  leg2: {
    scheduleId: string;
    tripId: string;
    busName: string;
    busType: string;
    fromCity: string;
    toCity: string;
    departureTime: string;
    arrivalTime: string;
    baseFare: number;
    availableSeats: number;
  };
  totalFare: number;
}

function SearchContent() {
  const params = useSearchParams();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const fromName = params.get("fromName") ?? "";
  const toName = params.get("toName") ?? "";
  const date = params.get("date") ?? "";

  const [tab, setTab] = useState<"direct" | "connecting">("direct");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [connectingOptions, setConnectingOptions] = useState<ConnectingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingLoading, setConnectingLoading] = useState(false);
  const [busType, setBusType] = useState("");
  const [sortBy, setSortBy] = useState("price_asc");

  useEffect(() => {
    async function search() {
      setLoading(true);
      const q = new URLSearchParams({ from, to, date, sortBy });
      if (busType) q.set("busType", busType);
      const res = await fetch(`/api/search?${q}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
        // Auto-load connecting options when no direct buses found
        if ((data.results ?? []).length === 0) {
          loadConnectingInBackground();
        }
      }
      setLoading(false);
    }
    if (from && to && date) search();
  }, [from, to, date, busType, sortBy]);

  async function loadConnectingInBackground() {
    setConnectingLoading(true);
    try {
      const res = await fetch(`/api/search/connecting?from=${from}&to=${to}&date=${date}`);
      if (res.ok) {
        const d = await res.json();
        const opts = d.options ?? [];
        setConnectingOptions(opts);
        if (opts.length > 0) setTab("connecting");
      }
    } finally {
      setConnectingLoading(false);
    }
  }

  async function loadConnecting() {
    if (connectingOptions.length > 0) return;
    setConnectingLoading(true);
    try {
      const res = await fetch(`/api/search/connecting?from=${from}&to=${to}&date=${date}`);
      if (res.ok) {
        const d = await res.json();
        setConnectingOptions(d.options ?? []);
      }
    } finally {
      setConnectingLoading(false);
    }
  }

  function handleTabChange(t: "direct" | "connecting") {
    setTab(t);
    if (t === "connecting") loadConnecting();
  }

  const formattedDate = date ? format(new Date(date), "EEE, d MMM yyyy") : "";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {fromName} → {toName}
          </h1>
          <p className="text-sm text-gray-500">{formattedDate} · {results.length} direct buses found</p>
        </div>
        <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Modify Search
        </Link>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(["direct", "connecting"] as const).map(t => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${tab === t ? "bg-white shadow text-blue-700" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t === "direct" ? `Direct (${results.length})` : "Connecting"}
          </button>
        ))}
      </div>

      {tab === "direct" && (
        <div className="flex gap-6">
          {/* Filters */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 font-semibold text-gray-900">Filters</h2>
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Bus Type</p>
                {[
                  { value: "", label: "All" },
                  { value: "AC_SEATER", label: "AC Seater" },
                  { value: "NON_AC_SEATER", label: "Non-AC Seater" },
                  { value: "AC_SLEEPER", label: "AC Sleeper" },
                  { value: "NON_AC_SLEEPER", label: "Non-AC Sleeper" },
                  { value: "AC_SEMI_SLEEPER", label: "AC Semi-Sleeper" },
                ].map((opt) => (
                  <label key={opt.value} className="mb-1 flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="busType"
                      value={opt.value}
                      checked={busType === opt.value}
                      onChange={() => setBusType(opt.value)}
                      className="text-blue-600"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">{results.length} results</p>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="departure_asc">Departure: Earliest First</option>
              </select>
            </div>

            {loading ? (
              <PageSpinner />
            ) : results.length === 0 ? (
              <div className="rounded-xl bg-white p-12 text-center shadow-sm">
                <p className="text-4xl mb-4">🚌</p>
                <h3 className="text-lg font-semibold text-gray-900">No direct buses found</h3>
                <p className="mt-1 text-sm text-gray-500">Try the Connecting tab for indirect routes</p>
                <Link href="/" className="mt-4 inline-block text-sm font-medium text-blue-600">
                  Back to Search
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {results.map((r) => (
                  <BusCard key={r.scheduleId} result={r} date={date} />
                ))}
              </div>
            )}

            {/* Group booking link */}
            {results.length > 0 && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-900">Travelling with a group?</p>
                  <p className="text-xs text-blue-700">Book multiple seats at once with our group booking feature.</p>
                </div>
                <Link
                  href={`/bulk-booking?from=${from}&to=${to}&date=${date}`}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Book for Group
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "connecting" && (
        <div>
          {connectingLoading ? (
            <PageSpinner />
          ) : connectingOptions.length === 0 ? (
            <div className="rounded-xl bg-white p-12 text-center shadow-sm">
              <p className="text-4xl mb-4">🔀</p>
              <h3 className="text-lg font-semibold text-gray-900">No connecting routes found</h3>
              <p className="mt-1 text-sm text-gray-500">No connecting journeys available for this date.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {connectingOptions.map((opt, i) => (
                <div key={i} className="rounded-xl bg-white shadow-sm overflow-hidden border border-gray-200">
                  {/* Leg 1 */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Leg 1</span>
                          <span className="font-medium text-gray-900">{opt.leg1.busName}</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {opt.leg1.fromCity} → {opt.leg1.toCity}
                        </p>
                        <p className="text-xs text-gray-500">
                          Dep {format(new Date(opt.leg1.departureTime), "HH:mm")} · Arr {opt.transferCity} {format(new Date(opt.leg1.arrivalTime), "HH:mm")}
                        </p>
                        <p className="text-xs text-gray-400">{opt.leg1.availableSeats} seats available</p>
                      </div>
                      <p className="text-lg font-bold text-gray-900">₹{Number(opt.leg1.baseFare).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Transfer badge */}
                  <div className="bg-amber-50 px-4 py-2 flex items-center gap-2 text-xs text-amber-700">
                    <span>🔀</span>
                    <span>
                      Transfer at <strong>{opt.transferCity}</strong>
                      {opt.transferWaitMins != null && (
                        <> — {opt.transferWaitMins >= 60
                          ? `${Math.floor(opt.transferWaitMins / 60)}h ${opt.transferWaitMins % 60}m wait`
                          : `${opt.transferWaitMins}m wait`}
                        </>
                      )}
                    </span>
                  </div>

                  {/* Leg 2 */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">Leg 2</span>
                          <span className="font-medium text-gray-900">{opt.leg2.busName}</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {opt.leg2.fromCity} → {opt.leg2.toCity}
                        </p>
                        {(() => {
                          const leg2Dep = new Date(opt.leg2.departureTime);
                          const isNextDay = leg2Dep.toDateString() !== new Date(date).toDateString();
                          return (
                            <p className="text-xs text-gray-500">
                              Dep {format(leg2Dep, "HH:mm")}{isNextDay && <span className="ml-1 rounded bg-orange-100 px-1 text-orange-600 font-semibold">+1</span>} · Arr {format(new Date(opt.leg2.arrivalTime), "HH:mm")}
                            </p>
                          );
                        })()}
                        <p className="text-xs text-gray-400">{opt.leg2.availableSeats} seats available</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">₹{Number(opt.leg2.baseFare).toLocaleString()}</p>
                        <p className="text-xs text-gray-400">Total: ₹{opt.totalFare.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Link
                        href={`/connecting-booking?leg1ScheduleId=${opt.leg1.scheduleId}&leg2ScheduleId=${opt.leg2.scheduleId}&date=${date}&transferCity=${encodeURIComponent(opt.transferCity)}`}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Book Connecting Tickets
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SearchContent />
    </Suspense>
  );
}
