"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";

const statusVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  SCHEDULED: "default",
  BOARDING: "info",
  IN_PROGRESS: "success",
  COMPLETED: "success",
  CANCELLED: "danger",
  DELAYED: "warning",
};

type SortField = "travelDate" | "route" | "bus" | "driver" | "status";

export default function TripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("travelDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showPast, setShowPast] = useState(false);

  const loadTrips = useCallback(() => {
    const params = new URLSearchParams({ sort: sortField, dir: sortDir, ...(showPast ? { past: "1" } : {}) });
    fetch(`/api/operator/trips?${params}`)
      .then((r) => r.json())
      .then((t) => { setTrips(Array.isArray(t) ? t : []); setLoading(false); });
  }, [sortField, sortDir, showPast]);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  function SortTh({ field, label }: { field: SortField; label: string }) {
    return (
      <th
        className="cursor-pointer select-none px-4 py-3 hover:text-gray-700"
        onClick={() => toggleSort(field)}
      >
        {label}<SortIcon field={field} />
      </th>
    );
  }

  if (loading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Trips</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showPast}
            onChange={(e) => setShowPast(e.target.checked)}
            className="rounded"
          />
          Show past trips
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
              <SortTh field="travelDate" label="Date" />
              <SortTh field="route" label="Route" />
              <SortTh field="bus" label="Bus" />
              <SortTh field="driver" label="Driver" />
              <th className="px-4 py-3">Occupancy</th>
              <SortTh field="status" label="Status" />
            </tr>
          </thead>
          <tbody>
            {trips.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400">No trips found</td></tr>
            )}
            {trips.map((trip) => (
              <tr key={trip.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {new Date(trip.travelDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {trip.schedule?.route?.fromCity?.name} → {trip.schedule?.route?.toCity?.name}
                </td>
                <td className="px-4 py-3 text-gray-600">{trip.schedule?.bus?.name}</td>
                <td className="px-4 py-3 text-gray-600">
                  {trip.driver?.user?.name ?? <span className="text-orange-500 text-xs">Unassigned</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${
                          trip.occupancyRate >= 90 ? "bg-red-500" : trip.occupancyRate >= 60 ? "bg-yellow-400" : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(trip.occupancyRate, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{trip.bookedSeats}/{trip.totalSeats}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[trip.status] ?? "default"}>
                    {trip.status.replace("_", " ")}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
