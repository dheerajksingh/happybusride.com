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

function SearchContent() {
  const params = useSearchParams();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const fromName = params.get("fromName") ?? "";
  const toName = params.get("toName") ?? "";
  const date = params.get("date") ?? "";

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
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
        setResults(data.results);
      }
      setLoading(false);
    }
    if (from && to && date) search();
  }, [from, to, date, busType, sortBy]);

  const formattedDate = date ? format(new Date(date), "EEE, d MMM yyyy") : "";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {fromName} → {toName}
          </h1>
          <p className="text-sm text-gray-500">{formattedDate} · {results.length} buses found</p>
        </div>
        <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Modify Search
        </Link>
      </div>

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

        {/* Results */}
        <div className="flex-1">
          {/* Sort */}
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
              <h3 className="text-lg font-semibold text-gray-900">No buses found</h3>
              <p className="mt-1 text-sm text-gray-500">Try a different date or route</p>
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
        </div>
      </div>
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
