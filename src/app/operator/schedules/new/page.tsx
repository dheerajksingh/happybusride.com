"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Suspense } from "react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type FreightSpace = { label: string; lengthCm: number; widthCm: number; heightCm: number };
type StopTiming = { arrival: string; stoppage: string }; // arrival = "HH:MM", stoppage = minutes

// Add minutes to "HH:MM", returns "HH:MM" (handles midnight crossing)
function addMins(time: string, mins: number): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

// Difference in minutes (b - a), handles overnight (result always >= 0)
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

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.35);
}

// Estimate travel time in minutes from distance (50 km/h average for Indian intercity buses)
function estimateMins(distanceKm: number): number {
  return Math.round((distanceKm / 50) * 60);
}

function fmtDuration(mins: number): string {
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// Returns warning string if arrival time is outside plausible range for the distance
function validateArrival(depTime: string, arrTime: string, distanceKm: number): string | null {
  const actual = diffMins(depTime, arrTime);
  const minMins = Math.round((distanceKm / 80) * 60); // 80 km/h — fastest plausible
  const maxMins = Math.round((distanceKm / 25) * 60); // 25 km/h — slowest plausible
  if (actual < minMins)
    return `Too fast for ${distanceKm} km — minimum ${fmtDuration(minMins)} (at 80 km/h). Estimated: ${fmtDuration(estimateMins(distanceKm))}.`;
  if (actual > maxMins)
    return `Too long for ${distanceKm} km — maximum ${fmtDuration(maxMins)} (at 25 km/h). Estimated: ${fmtDuration(estimateMins(distanceKm))}.`;
  return null;
}

function segmentDistKm(stop: any, prevStop: any): string {
  // Prefer stored cumulative distances
  if (stop.distanceFromOriginKm != null && prevStop.distanceFromOriginKm != null) {
    return `${stop.distanceFromOriginKm - prevStop.distanceFromOriginKm} km`;
  }
  // Fall back to Haversine from city coordinates
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

// Cumulative km from origin for each stop. Prefers the stored
// distanceFromOriginKm; falls back to summing Haversine between consecutive
// city coordinates when distances aren't stored on the route.
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
// = the previous stop's DEPARTURE (its arrival + its stoppage) + travel time for
// the inter-stop distance (50 km/h). Stops before `fromIdx` keep their values
// (operator edits), and every stoppage is preserved. Origin arrival = departure.
// With a blank departure, arrivals stay blank until the operator enters one.
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
  const [dh, dm] = depTime.split(":").map(Number);
  const [ah, am] = arrTime.split(":").map(Number);
  const arrDate = new Date(depDateTime);
  if (ah * 60 + am < dh * 60 + dm) arrDate.setDate(arrDate.getDate() + 1);
  return `${arrDate.toISOString().slice(0, 10)}T${arrTime}`;
}

function NewScheduleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRouteId = searchParams.get("routeId") ?? "";

  const [routes, setRoutes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [freightSpaces, setFreightSpaces] = useState<FreightSpace[]>([]);
  const [routeStops, setRouteStops] = useState<any[]>([]);
  const [stopTimings, setStopTimings] = useState<Record<string, StopTiming>>({});
  const [arrivalWarning, setArrivalWarning] = useState<string | null>(null);

  const [form, setForm] = useState({
    routeId: defaultRouteId,
    busId: "",
    driverId: "",
    departureTime: "",   // blank — operator enters it; arrivals derive from it
    arrivalTime: "",     // auto-calculated once departure + route are set
    baseFare: "",
  });

  const depTimeOnly = extractTime(form.departureTime); // "HH:MM"
  const cum = useMemo(() => cumulativeKm(routeStops), [routeStops]);

  useEffect(() => {
    Promise.all([
      fetch("/api/operator/routes?all=true").then((r) => r.json()),
      fetch("/api/operator/buses?available=true").then((r) => r.json()),
      fetch("/api/operator/drivers?available=true").then((r) => r.json()),
    ]).then(([r, b, d]) => {
      setRoutes(Array.isArray(r) ? r : []);
      setBuses(Array.isArray(b) ? b : []);
      setDrivers(Array.isArray(d) ? d : []);
    });
  }, []);

  // Load stops when route changes (timings are derived from distance below).
  useEffect(() => {
    if (!form.routeId) { setRouteStops([]); setStopTimings({}); return; }
    const route = routes.find((r: any) => r.id === form.routeId);
    if (!route) return;
    setRouteStops(route.stops ?? []);
  }, [form.routeId, routes]);

  // When the route or departure time changes, recompute the whole chain from the
  // origin. Operator stoppage edits are preserved; arrivals are re-derived from
  // distance. Per-stop edits cascade downstream via updateTiming (below).
  useEffect(() => {
    if (routeStops.length === 0) return;
    const next = cascade(routeStops, cum, depTimeOnly, stopTimings, 1);
    setStopTimings(next);
    const lastId = routeStops[routeStops.length - 1].id;
    setForm((f) => ({ ...f, arrivalTime: arrivalDateTime(f.departureTime, depTimeOnly, next[lastId]?.arrival ?? "") }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeStops, form.departureTime]);

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

  // Operator edits a stop's arrival or stoppage: keep that edit, then recompute
  // every stop after it (next arrival = this stop's departure + travel time),
  // and re-adjust the destination arrival in the form.
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

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  function addFreightSpace() {
    setFreightSpaces((prev) => [...prev, { label: `Space ${prev.length + 1}`, lengthCm: 100, widthCm: 100, heightCm: 100 }]);
  }
  function updateFreightSpace(i: number, field: keyof FreightSpace, value: string | number) {
    setFreightSpaces((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }
  function removeFreightSpace(i: number) {
    setFreightSpaces((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.routeId || !form.busId || !form.baseFare) {
      alert("Fill all required fields");
      return;
    }
    setLoading(true);

    // Convert timings to arrivalOffset/departureOffset (minutes from route departure)
    const stopOffsets = routeStops.map((s: any, idx: number) => {
      if (idx === 0) return { stopId: s.id, arrivalOffset: 0, departureOffset: 0 };
      const t = stopTimings[s.id];
      const arrOffset = diffMins(depTimeOnly, t?.arrival ?? depTimeOnly);
      const stoppageMins = Number(t?.stoppage ?? 0);
      return { stopId: s.id, arrivalOffset: arrOffset, departureOffset: arrOffset + stoppageMins };
    });

    const res = await fetch("/api/operator/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        driverId: form.driverId || undefined,
        baseFare: Number(form.baseFare),
        daysOfWeek,
        freightSpaces: freightSpaces.length > 0 ? freightSpaces : undefined,
        stopOffsets,
      }),
    });
    setLoading(false);
    if (res.ok) router.push("/operator/schedules");
    else alert("Failed to create schedule");
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/operator/schedules" className="text-sm text-blue-600 hover:underline">← Schedules</Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Schedule</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        {/* Route */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Route *</label>
          <select
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
            value={form.routeId}
            onChange={(e) => setForm((f) => ({ ...f, routeId: e.target.value }))}
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

        {/* Bus */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Bus *</label>
          <select
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
            value={form.busId}
            onChange={(e) => setForm((f) => ({ ...f, busId: e.target.value }))}
            required
          >
            <option value="">Select bus (unscheduled only)</option>
            {buses.filter((b: any) => b.isActive).map((b: any) => (
              <option key={b.id} value={b.id}>{b.name} ({b.registrationNo})</option>
            ))}
          </select>
          {buses.filter((b: any) => b.isActive).length === 0 && (
            <p className="mt-1 text-xs text-orange-600">All active buses are already scheduled or marked as charter-only.</p>
          )}
        </div>

        {/* Driver */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Default Driver</label>
          <select
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
            value={form.driverId}
            onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}
          >
            <option value="">No driver assigned</option>
            {drivers.map((d: any) => (
              <option key={d.id} value={d.id}>{d.user?.name} ({d.licenseNumber})</option>
            ))}
          </select>
          {drivers.length === 0 && (
            <p className="mt-1 text-xs text-orange-600">All drivers are already assigned to active schedules.</p>
          )}
        </div>

        {/* Departure / Arrival */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Departure Time *</label>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
              value={form.departureTime}
              onChange={(e) => setForm((f) => ({ ...f, departureTime: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Arrival Time *
              {routeStops.length > 0 && (
                <span className="ml-1 text-xs font-normal text-blue-500">(auto-calculated)</span>
              )}
            </label>
            <input
              type="datetime-local"
              className={`w-full rounded-lg border p-2.5 text-sm ${
                arrivalWarning ? "border-orange-400 bg-orange-50" :
                routeStops.length > 0 ? "border-blue-200 bg-blue-50 text-gray-700" :
                "border-gray-300"
              }`}
              value={form.arrivalTime}
              onChange={(e) => { setForm((f) => ({ ...f, arrivalTime: e.target.value })); }}
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

        {/* Stop times table */}
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

                        {/* Distance from prev */}
                        <td className="px-3 py-2.5 text-right text-xs text-gray-500">
                          {distFromPrev}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-gray-400">Arrivals derive from distance (50 km/h) + each stop&apos;s stoppage (default {STOP_DWELL_MINS} min). Edit an arrival or stoppage and the following stops recalculate. Departure = Arrival + Stoppage.</p>
          </div>
        )}

        {/* Base fare */}
        <Input
          label="Base Fare (₹) *"
          type="number"
          min={1}
          placeholder="e.g. 800"
          value={form.baseFare}
          onChange={(e) => setForm((f) => ({ ...f, baseFare: e.target.value }))}
          required
        />

        {/* Days of week */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Days of Week <span className="font-normal text-gray-400">(empty = every day)</span>
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

        {/* Freight spaces */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Freight Spaces</label>
            <button type="button" onClick={addFreightSpace} className="text-xs text-blue-600 hover:underline">
              + Add Space
            </button>
          </div>
          {freightSpaces.length === 0 && (
            <p className="text-xs text-gray-400">No freight spaces defined.</p>
          )}
          {freightSpaces.map((space, i) => (
            <div key={i} className="mb-2 rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <input
                  className="rounded border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 w-32"
                  value={space.label}
                  onChange={(e) => updateFreightSpace(i, "label", e.target.value)}
                  placeholder="Space label"
                />
                <button type="button" onClick={() => removeFreightSpace(i)} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["lengthCm", "widthCm", "heightCm"] as const).map((dim) => (
                  <div key={dim}>
                    <label className="mb-0.5 block text-xs text-gray-500">{dim.replace("Cm", " (cm)")}</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                      value={space[dim]}
                      onChange={(e) => updateFreightSpace(i, dim, Number(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400">
          Trips will be auto-generated starting from tomorrow for the next 30 days.
        </p>

        <Button type="submit" variant="primary" loading={loading} className="w-full">
          Create Schedule
        </Button>
      </form>
    </div>
  );
}

export default function NewSchedulePage() {
  return (
    <Suspense>
      <NewScheduleForm />
    </Suspense>
  );
}
