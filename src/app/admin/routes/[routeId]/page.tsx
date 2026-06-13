"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CityAutocomplete } from "@/components/ui/CityAutocomplete";
import type { City } from "@/components/ui/CityAutocomplete";

type IntermediateStop = { cityId: string; cityName: string; stopName: string; arrivalOffset: number; departureOffset: number };

export default function AdminRouteEditPage({ params }: { params: Promise<{ routeId: string }> }) {
  const { routeId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStops, setSavingStops] = useState(false);
  const [route, setRoute] = useState<any>(null);
  const [form, setForm] = useState({ name: "", distanceKm: "", durationMins: "", isActive: true });
  const [intermediates, setIntermediates] = useState<IntermediateStop[]>([]);

  function loadRoute() {
    return fetch(`/api/admin/routes/${routeId}`)
      .then(r => r.json())
      .then(d => {
        setRoute(d);
        setForm({
          name: d.name ?? "",
          distanceKm: d.distanceKm?.toString() ?? "",
          durationMins: d.durationMins?.toString() ?? "",
          isActive: d.isActive ?? true,
        });
        // Extract intermediate stops (not first and not last)
        const stops = (d.stops ?? []).sort((a: any, b: any) => a.stopOrder - b.stopOrder);
        const inter = stops.slice(1, stops.length - 1);
        setIntermediates(inter.map((s: any) => ({
          cityId: s.cityId,
          cityName: s.city?.name ?? "",
          stopName: s.stopName,
          arrivalOffset: s.arrivalOffset ?? 0,
          departureOffset: s.departureOffset ?? 0,
        })));
        setLoading(false);
      });
  }

  useEffect(() => { loadRoute(); }, [routeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/admin/routes/${routeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        distanceKm: form.distanceKm ? Number(form.distanceKm) : null,
        durationMins: form.durationMins ? Number(form.durationMins) : null,
        isActive: form.isActive,
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/admin/routes");
    else alert("Failed to save route");
  }

  async function handleSaveStops() {
    if (intermediates.some(s => !s.cityId)) { alert("Fill city for all stops"); return; }
    setSavingStops(true);
    const res = await fetch(`/api/admin/routes/${routeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stops: intermediates.map(s => ({
          cityId: s.cityId,
          stopName: s.stopName || `${s.cityName} Bus Stand`,
          arrivalOffset: s.arrivalOffset,
          departureOffset: s.departureOffset,
        })),
      }),
    });
    setSavingStops(false);
    if (res.ok) { await loadRoute(); alert("Stops saved."); }
    else { const d = await res.json(); alert(d.error ?? "Failed to save stops"); }
  }

  async function handleDeactivate() {
    if (!confirm("Deactivate this route? Operators will no longer see it.")) return;
    await fetch(`/api/admin/routes/${routeId}`, { method: "DELETE" });
    router.push("/admin/routes");
  }

  const inputCls = "w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none";
  const labelCls = "mb-1 block text-sm font-medium text-gray-700";

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (!route) return <div className="p-8 text-red-500">Route not found.</div>;

  const allStops = (route.stops ?? []).sort((a: any, b: any) => a.stopOrder - b.stopOrder);
  const originStop = allStops[0];
  const destStop   = allStops[allStops.length - 1];
  const scheduleCount = route._count?.schedules ?? 0;
  const canEditStops  = scheduleCount === 0;

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/admin/routes" className="text-sm text-blue-600 hover:underline">← Routes</Link>
      </div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Edit Route</h1>
      <p className="mb-6 text-sm text-gray-500 flex items-center gap-2">
        {route.fromCity?.name} → {route.toCity?.name}
        {!route.operatorId && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Admin Route</span>}
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{scheduleCount} schedule{scheduleCount !== 1 ? "s" : ""}</span>
      </p>

      {/* Route details */}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <div>
          <label className={labelCls}>Route Name *</label>
          <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Distance (km)</label>
            <input type="number" min={1} className={inputCls} value={form.distanceKm} onChange={e => setForm(f => ({ ...f, distanceKm: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Duration (mins)</label>
            <input type="number" min={1} className={inputCls} value={form.durationMins} onChange={e => setForm(f => ({ ...f, durationMins: e.target.value }))} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isActive" checked={form.isActive}
            onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4" />
          <label htmlFor="isActive" className="text-sm text-gray-700">Route is active</label>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" loading={saving} className="flex-1">Save Changes</Button>
          <button type="button" onClick={handleDeactivate}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
            Deactivate
          </button>
        </div>
      </form>

      {/* Stops section */}
      <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Stops ({allStops.length})</h2>
          {canEditStops && (
            <button type="button"
              onClick={() => setIntermediates(p => [...p, { cityId: "", cityName: "", stopName: "", arrivalOffset: 0, departureOffset: 0 }])}
              className="text-xs text-blue-600 hover:underline">
              + Add Intermediate Stop
            </button>
          )}
        </div>

        {!canEditStops && (
          <p className="mb-3 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
            This route has {scheduleCount} schedule(s) — stops are locked. Remove all schedules first to edit stops.
          </p>
        )}

        {/* Origin — always locked */}
        <div className="mb-2 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">1</span>
          <span className="font-medium text-blue-800">{originStop?.city?.name}</span>
          <span className="text-xs text-blue-400">{originStop?.stopName}</span>
          <span className="ml-auto text-xs text-blue-400">(origin)</span>
        </div>

        {/* Intermediate stops */}
        {canEditStops ? (
          <>
            {intermediates.map((stop, i) => (
              <div key={i} className="mb-2 rounded-lg border border-gray-200 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">{i + 2}</span>
                  <button type="button" onClick={() => setIntermediates(p => p.filter((_, idx) => idx !== i))}
                    className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <CityAutocomplete
                    label="City"
                    value={stop.cityName || ""}
                    onChange={(c) => setIntermediates(p => p.map((s, idx) =>
                      idx === i ? { ...s, cityId: c.id, cityName: c.name, stopName: s.stopName || `${c.name} Bus Stand` } : s
                    ))}
                    placeholder="Search city…"
                  />
                  <div>
                    <label className="mb-0.5 block text-xs text-gray-500">Stop Name</label>
                    <input className="w-full rounded border border-gray-200 p-1.5 text-xs"
                      value={stop.stopName}
                      onChange={e => setIntermediates(p => p.map((s, idx) => idx === i ? { ...s, stopName: e.target.value } : s))}
                      placeholder="e.g. Nawada Bus Stand" />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-xs text-gray-500">Arrival Offset (mins)</label>
                    <input type="number" min={0} className="w-full rounded border border-gray-200 p-1.5 text-xs"
                      value={stop.arrivalOffset}
                      onChange={e => setIntermediates(p => p.map((s, idx) => idx === i ? { ...s, arrivalOffset: Number(e.target.value) } : s))} />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-xs text-gray-500">Departure Offset (mins)</label>
                    <input type="number" min={0} className="w-full rounded border border-gray-200 p-1.5 text-xs"
                      value={stop.departureOffset}
                      onChange={e => setIntermediates(p => p.map((s, idx) => idx === i ? { ...s, departureOffset: Number(e.target.value) } : s))} />
                  </div>
                </div>
              </div>
            ))}
            {intermediates.length === 0 && (
              <p className="my-2 text-xs text-gray-400 text-center py-2">No intermediate stops. Click "+ Add Intermediate Stop" to add cities along the way.</p>
            )}
            <button type="button" onClick={handleSaveStops} disabled={savingStops}
              className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {savingStops ? "Saving stops…" : "Save Stops"}
            </button>
          </>
        ) : (
          allStops.slice(1, allStops.length - 1).map((stop: any) => (
            <div key={stop.id} className="mb-2 flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">{stop.stopOrder}</span>
              <span className="font-medium text-gray-900">{stop.city?.name}</span>
              <span className="text-gray-500">{stop.stopName}</span>
              {stop.distanceFromOriginKm != null && (
                <span className="ml-auto text-xs text-gray-400">{stop.distanceFromOriginKm} km from origin</span>
              )}
            </div>
          ))
        )}

        {/* Destination — always locked */}
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
            {allStops.length}
          </span>
          <span className="font-medium text-green-800">{destStop?.city?.name}</span>
          <span className="text-xs text-green-400">{destStop?.stopName}</span>
          {destStop?.distanceFromOriginKm != null && (
            <span className="ml-auto text-xs text-green-600">{destStop.distanceFromOriginKm} km total</span>
          )}
          <span className="text-xs text-green-400">(destination)</span>
        </div>
      </div>
    </div>
  );
}
