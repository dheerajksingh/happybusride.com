"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type StopTiming = { arrival: string; stoppage: string };

function addMins(time: string, mins: number): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function diffMins(a: string, b: string): number {
  if (!a || !b) return 0;
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  let diff = (bh * 60 + bm) - (ah * 60 + am);
  if (diff < 0) diff += 24 * 60;
  return diff;
}

function extractTime(datetimeLocal: string): string {
  return datetimeLocal.includes("T") ? datetimeLocal.split("T")[1].slice(0, 5) : "";
}

function estimateMins(distanceKm: number): number {
  return Math.round((distanceKm / 50) * 60);
}

function fmtDuration(mins: number): string {
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function validateArrival(depTime: string, arrTime: string, distanceKm: number): string | null {
  const actual = diffMins(depTime, arrTime);
  const minMins = Math.round((distanceKm / 80) * 60);
  const maxMins = Math.round((distanceKm / 25) * 60);
  if (actual < minMins)
    return `Too fast for ${distanceKm} km — minimum ${fmtDuration(minMins)} (at 80 km/h). Estimated: ${fmtDuration(estimateMins(distanceKm))}.`;
  if (actual > maxMins)
    return `Too long for ${distanceKm} km — maximum ${fmtDuration(maxMins)} (at 25 km/h). Estimated: ${fmtDuration(estimateMins(distanceKm))}.`;
  return null;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.35);
}

function segmentDistKm(stop: any, prevStop: any): string {
  if (stop.distanceFromOriginKm != null && prevStop.distanceFromOriginKm != null) {
    return `${stop.distanceFromOriginKm - prevStop.distanceFromOriginKm} km`;
  }
  const lat1 = Number(prevStop.city?.latitude);
  const lng1 = Number(prevStop.city?.longitude);
  const lat2 = Number(stop.city?.latitude);
  const lng2 = Number(stop.city?.longitude);
  if (lat1 && lng1 && lat2 && lng2) {
    return `~${haversineKm(lat1, lng1, lat2, lng2)} km`;
  }
  return "—";
}

const STOP_DWELL_MINS = 5; // default minutes a bus halts at each intermediate stop

// Cumulative km from origin for each stop (prefers stored distanceFromOriginKm,
// falls back to Haversine between consecutive city coordinates).
function cumulativeKm(stops: any[]): number[] {
  const cum: number[] = [];
  let running = 0;
  stops.forEach((s, i) => {
    if (s.distanceFromOriginKm != null) {
      running = Number(s.distanceFromOriginKm);
    } else if (i > 0) {
      const p = stops[i - 1];
      const lat1 = Number(p.city?.latitude), lng1 = Number(p.city?.longitude);
      const lat2 = Number(s.city?.latitude), lng2 = Number(s.city?.longitude);
      if (lat1 && lng1 && lat2 && lng2) running += haversineKm(lat1, lng1, lat2, lng2);
    }
    cum.push(running);
  });
  return cum;
}

// Forward cascade: recompute arrivals from `fromIdx` onward. Each stop's arrival
// = previous stop's departure (arrival + stoppage) + travel time for the
// inter-stop distance (50 km/h). Earlier stops and all stoppages are preserved.
function cascade(
  stops: any[],
  cum: number[],
  depTime: string,
  prior: Record<string, StopTiming>,
  fromIdx: number,
): Record<string, StopTiming> {
  const out: Record<string, StopTiming> = {};
  stops.forEach((s, i) => {
    if (i === 0) { out[s.id] = { arrival: depTime, stoppage: "0" }; return; }
    const isLast = i === stops.length - 1;
    const stoppage = isLast ? "0" : (prior[s.id]?.stoppage ?? String(STOP_DWELL_MINS));
    if (i < fromIdx) { out[s.id] = prior[s.id] ?? { arrival: "", stoppage }; return; }
    const prev = out[stops[i - 1].id];
    const prevDep = i - 1 === 0
      ? depTime
      : (prev?.arrival ? addMins(prev.arrival, Number(prev.stoppage || 0)) : "");
    const segKm = (cum[i] ?? 0) - (cum[i - 1] ?? 0);
    out[s.id] = { arrival: prevDep ? addMins(prevDep, estimateMins(segKm)) : "", stoppage };
  });
  return out;
}

// Build the form's datetime-local arrival string (handles past-midnight rollover).
function arrivalDateTime(depDateTime: string, depTime: string, arrTime: string): string {
  if (!depDateTime || !depTime || !arrTime) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const [dh, dm] = depTime.split(":").map(Number);
  const [ah, am] = arrTime.split(":").map(Number);
  const arrDate = new Date(depDateTime);
  if (ah * 60 + am < dh * 60 + dm) arrDate.setDate(arrDate.getDate() + 1);
  return `${arrDate.getFullYear()}-${pad(arrDate.getMonth() + 1)}-${pad(arrDate.getDate())}T${arrTime}`;
}

export default function EditSchedulePage() {
  const router = useRouter();
  const { scheduleId } = useParams<{ scheduleId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [routeStops, setRouteStops] = useState<any[]>([]);
  const [stopTimings, setStopTimings] = useState<Record<string, StopTiming>>({});
  const [arrivalWarning, setArrivalWarning] = useState<string | null>(null);
  const [form, setForm] = useState({
    routeId: "",
    busId: "",
    driverId: "",
    departureTime: "",
    arrivalTime: "",
    baseFare: "",
    isActive: true,
  });
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [regenerateTrips, setRegenerateTrips] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/operator/schedules/${scheduleId}`).then((r) => r.json()),
      fetch("/api/operator/routes?all=true").then((r) => r.json()),
      fetch("/api/operator/buses").then((r) => r.json()),
      fetch("/api/operator/drivers?available=true").then((r) => r.json()),
    ]).then(([s, r, b, d]) => {
      setDrivers(Array.isArray(d) ? d : []);
      if (s && !s.error) {
        const dep = new Date(s.departureTime);
        const arr = new Date(s.arrivalTime);
        const toLocal = (d: Date) => {
          const pad = (n: number) => String(n).padStart(2, "0");
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        setForm({
          routeId: s.routeId,
          busId: s.busId,
          driverId: s.driverId ?? "",
          departureTime: toLocal(dep),
          arrivalTime: toLocal(arr),
          baseFare: String(Number(s.baseFare)),
          isActive: s.isActive,
        });
        setDaysOfWeek(s.daysOfWeek ?? []);

        // Load stops from the route included in schedule response
        const stops = s.route?.stops ?? [];
        const depTime = toLocal(dep).split("T")[1]?.slice(0, 5) ?? "";
        setRouteStops(stops);
        const timings: Record<string, StopTiming> = {};
        stops.forEach((stop: any, idx: number) => {
          if (idx === 0) {
            timings[stop.id] = { arrival: depTime, stoppage: "0" };
          } else {
            const arr = stop.arrivalOffset ? addMins(depTime, stop.arrivalOffset) : "";
            const stoppageMins = (stop.departureOffset ?? 0) - (stop.arrivalOffset ?? 0);
            timings[stop.id] = { arrival: arr, stoppage: String(Math.max(0, stoppageMins)) };
          }
        });
        setStopTimings(timings);
      }
      setRoutes(Array.isArray(r) ? r : []);
      setBuses(Array.isArray(b) ? b : []);
      setLoading(false);
    });
  }, [scheduleId]);

  // Sync form arrivalTime → last stop's arrival in the table
  useEffect(() => {
    if (routeStops.length === 0 || !form.arrivalTime) return;
    const lastStop = routeStops[routeStops.length - 1];
    const arrTimeOnly = extractTime(form.arrivalTime);
    if (!arrTimeOnly) return;
    setStopTimings((prev) => ({
      ...prev,
      [lastStop.id]: { ...prev[lastStop.id] ?? { stoppage: "0" }, arrival: arrTimeOnly },
    }));
  }, [form.arrivalTime, routeStops]);

  // Validate arrival time against route distance
  useEffect(() => {
    if (!form.arrivalTime || !form.departureTime || !form.routeId) { setArrivalWarning(null); return; }
    const route = routes.find((r: any) => r.id === form.routeId);
    if (!route?.distanceKm) { setArrivalWarning(null); return; }
    const warning = validateArrival(extractTime(form.departureTime), extractTime(form.arrivalTime), route.distanceKm);
    setArrivalWarning(warning);
  }, [form.arrivalTime, form.departureTime, form.routeId, routes]);

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  const depTimeOnly = extractTime(form.departureTime);
  const cum = useMemo(() => cumulativeKm(routeStops), [routeStops]);

  // Operator switches route: load its stops and recompute the whole chain from
  // distance (fresh default stoppages), then the destination arrival.
  function selectRoute(routeId: string) {
    const route = routes.find((r: any) => r.id === routeId);
    const stops = route?.stops ?? [];
    setRouteStops(stops);
    const next = cascade(stops, cumulativeKm(stops), depTimeOnly, {}, 1);
    setStopTimings(next);
    const lastId = stops[stops.length - 1]?.id;
    setForm((f) => ({ ...f, routeId, arrivalTime: arrivalDateTime(f.departureTime, depTimeOnly, lastId ? next[lastId]?.arrival ?? "" : "") }));
  }

  // Operator changes departure: recompute every arrival from the origin
  // (preserving stoppages) and re-adjust the destination arrival.
  function changeDeparture(value: string) {
    const dep = extractTime(value);
    const next = cascade(routeStops, cum, dep, stopTimings, 1);
    setStopTimings(next);
    const lastId = routeStops[routeStops.length - 1]?.id;
    setForm((f) => ({ ...f, departureTime: value, arrivalTime: arrivalDateTime(value, dep, lastId ? next[lastId]?.arrival ?? "" : "") }));
  }

  // Operator edits a stop's arrival or stoppage: keep that edit, recompute every
  // stop after it, and re-adjust the destination arrival.
  function updateTiming(stopId: string, field: keyof StopTiming, value: string) {
    const updated = { ...stopTimings, [stopId]: { ...stopTimings[stopId], [field]: value } };
    const idx = routeStops.findIndex((s: any) => s.id === stopId);
    const next = cascade(routeStops, cum, depTimeOnly, updated, idx + 1);
    setStopTimings(next);
    const lastId = routeStops[routeStops.length - 1]?.id;
    if (lastId) {
      setForm((f) => ({ ...f, arrivalTime: arrivalDateTime(f.departureTime, depTimeOnly, next[lastId]?.arrival ?? "") }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const stopOffsetsPayload = routeStops.map((s: any, idx: number) => {
      if (idx === 0) return { stopId: s.id, arrivalOffset: 0, departureOffset: 0 };
      const t = stopTimings[s.id];
      const arrOffset = diffMins(depTimeOnly, t?.arrival ?? depTimeOnly);
      const stoppageMins = Number(t?.stoppage ?? 0);
      return { stopId: s.id, arrivalOffset: arrOffset, departureOffset: arrOffset + stoppageMins };
    });
    const res = await fetch(`/api/operator/schedules/${scheduleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        baseFare: Number(form.baseFare),
        daysOfWeek,
        regenerateTrips,
        stopOffsets: stopOffsetsPayload,
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/operator/schedules");
    else alert("Failed to update schedule");
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-lg">
      <div className="mb-4">
        <Link href="/operator/schedules" className="text-sm text-blue-600 hover:underline">
          ← Schedules
        </Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit Schedule</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Route *</label>
          <select
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
            value={form.routeId}
            onChange={(e) => selectRoute(e.target.value)}
            required
          >
            <option value="">Select route</option>
            {routes.map((r: any) => (
              <option key={r.id} value={r.id}>
                {r.fromCity?.name} → {r.toCity?.name} ({r.name})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Bus *</label>
          <select
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
            value={form.busId}
            onChange={(e) => setForm((f) => ({ ...f, busId: e.target.value }))}
            required
          >
            <option value="">Select bus</option>
            {buses.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.registrationNo})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Default Driver</label>
          <select
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
            value={form.driverId}
            onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}
          >
            <option value="">No driver assigned</option>
            {/* Always show the currently-assigned driver even if not in available list */}
            {form.driverId && !drivers.find((d: any) => d.id === form.driverId) && (
              <option value={form.driverId}>Current driver (assigned)</option>
            )}
            {drivers.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.user?.name} ({d.licenseNumber})
              </option>
            ))}
          </select>
          {drivers.length === 0 && (
            <p className="mt-1 text-xs text-orange-600">All drivers are already assigned to active schedules.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Departure Time *</label>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
              value={form.departureTime}
              onChange={(e) => changeDeparture(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Arrival Time *
              <span className="ml-1 text-xs font-normal text-blue-500">(auto-calculated)</span>
            </label>
            <input
              type="datetime-local"
              className={`w-full rounded-lg border p-2.5 text-sm ${
                arrivalWarning ? "border-orange-400 bg-orange-50" : "border-blue-200 bg-blue-50 text-gray-700"
              }`}
              value={form.arrivalTime}
              onChange={(e) => setForm((f) => ({ ...f, arrivalTime: e.target.value }))}
              required
            />
            {(() => {
              const route = routes.find((r: any) => r.id === form.routeId);
              const distKm = route?.distanceKm;
              if (!distKm) return null;
              const est = estimateMins(distKm);
              return (
                <p className="mt-1 text-xs text-gray-400">
                  {distKm} km route — estimated {fmtDuration(est)} at 50 km/h avg
                </p>
              );
            })()}
            {arrivalWarning && (
              <p className="mt-1 text-xs font-medium text-orange-600">⚠ {arrivalWarning}</p>
            )}
          </div>
        </div>

        {/* Stop times */}
        {routeStops.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Stop Times</label>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 text-left">Stop</th>
                    <th className="px-3 py-2 text-center">Arrival</th>
                    <th className="px-3 py-2 text-center">Stoppage (min)</th>
                    <th className="px-3 py-2 text-center">Departure</th>
                    <th className="px-3 py-2 text-right">Dist from prev</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {routeStops.map((stop: any, idx: number) => {
                    const isFirst = idx === 0;
                    const isLast = idx === routeStops.length - 1;
                    const t = stopTimings[stop.id] ?? { arrival: "", stoppage: "0" };
                    const stoppageMins = Number(t.stoppage || 0);
                    const departureDisplay = isFirst
                      ? depTimeOnly
                      : t.arrival ? addMins(t.arrival, stoppageMins) : "—";

                    const prevStop = idx > 0 ? routeStops[idx - 1] : null;
                    const distFromPrev = prevStop ? segmentDistKm(stop, prevStop) : "—";

                    return (
                      <tr key={stop.id} className={isFirst ? "bg-blue-50/30" : isLast ? "bg-green-50/30" : ""}>
                        <td className="px-3 py-2.5 font-medium text-gray-800">
                          {stop.stopName}
                          {isFirst && <span className="ml-1.5 text-xs text-blue-500 font-normal">(origin)</span>}
                          {isLast && <span className="ml-1.5 text-xs text-green-600 font-normal">(destination)</span>}
                        </td>

                        {/* Arrival — hidden for origin */}
                        <td className="px-3 py-2.5">
                          {isFirst ? (
                            <span className="block text-center text-xs text-gray-400">—</span>
                          ) : (
                            <input
                              type="time"
                              className="mx-auto block w-24 rounded border border-gray-300 px-2 py-1 text-center text-xs"
                              value={t.arrival}
                              onChange={(e) => updateTiming(stop.id, "arrival", e.target.value)}
                            />
                          )}
                        </td>

                        {/* Stoppage — hidden for origin and destination */}
                        <td className="px-3 py-2.5">
                          {isFirst || isLast ? (
                            <span className="block text-center text-xs text-gray-400">—</span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              className="mx-auto block w-16 rounded border border-gray-300 px-2 py-1 text-center text-xs"
                              value={t.stoppage}
                              onChange={(e) => updateTiming(stop.id, "stoppage", e.target.value)}
                            />
                          )}
                        </td>

                        {/* Departure — hidden for destination */}
                        <td className="px-3 py-2.5 text-center">
                          {isLast ? (
                            <span className="text-xs text-gray-400">—</span>
                          ) : (
                            <span className="inline-block rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                              {departureDisplay}
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-right text-xs text-gray-500">
                          {distFromPrev}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-gray-400">Saved times shown; change the route or departure to recalculate from distance. Edit an arrival or stoppage and the following stops recalculate. Departure = Arrival + Stoppage.</p>
          </div>
        )}

        <Input
          label="Base Fare (₹) *"
          type="number"
          min={1}
          placeholder="e.g. 800"
          value={form.baseFare}
          onChange={(e) => setForm((f) => ({ ...f, baseFare: e.target.value }))}
          required
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Days of Week{" "}
            <span className="font-normal text-gray-400">(empty = every day)</span>
          </label>
          <div className="flex gap-2">
            {DAY_LABELS.map((label, day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  daysOfWeek.includes(day)
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="isActive"
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={regenerateTrips}
              onChange={(e) => setRegenerateTrips(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-yellow-500"
            />
            <div>
              <span className="text-sm font-medium text-yellow-800">Regenerate future trips</span>
              <p className="text-xs text-yellow-700 mt-0.5">
                Deletes upcoming SCHEDULED trips with no bookings and recreates them based on the updated days of week.
              </p>
            </div>
          </label>
        </div>

        <Button type="submit" variant="primary" loading={saving} className="w-full">
          Save Changes
        </Button>
      </form>
    </div>
  );
}
