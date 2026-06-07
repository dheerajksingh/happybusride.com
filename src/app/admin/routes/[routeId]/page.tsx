"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

type Stop = { id: string; cityId: string; city: { id: string; name: string }; stopName: string; stopOrder: number; arrivalOffset: number | null; departureOffset: number | null };

export default function AdminRouteEditPage({ params }: { params: Promise<{ routeId: string }> }) {
  const { routeId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [route, setRoute] = useState<any>(null);
  const [form, setForm] = useState({ name: "", distanceKm: "", durationMins: "", isActive: true });

  useEffect(() => {
    fetch(`/api/admin/routes/${routeId}`)
      .then(r => r.json())
      .then(d => {
        setRoute(d);
        setForm({
          name: d.name ?? "",
          distanceKm: d.distanceKm?.toString() ?? "",
          durationMins: d.durationMins?.toString() ?? "",
          isActive: d.isActive ?? true,
        });
        setLoading(false);
      });
  }, [routeId]);

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

  async function handleDeactivate() {
    if (!confirm("Deactivate this route? Operators will no longer see it.")) return;
    await fetch(`/api/admin/routes/${routeId}`, { method: "DELETE" });
    router.push("/admin/routes");
  }

  const inputCls = "w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none";
  const labelCls = "mb-1 block text-sm font-medium text-gray-700";

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>;
  if (!route) return <div className="p-8 text-red-500">Route not found.</div>;

  const stops: Stop[] = route.stops ?? [];

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/admin/routes" className="text-sm text-blue-600 hover:underline">← Routes</Link>
      </div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Edit Route</h1>
      <p className="mb-6 text-sm text-gray-500">
        {route.fromCity?.name} → {route.toCity?.name}
        {!route.operatorId && <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Admin Route</span>}
      </p>

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
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
            className="h-4 w-4"
          />
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

      {/* Stops (read-only display) */}
      <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-gray-900">Stops ({stops.length})</h2>
        {stops.length === 0 ? (
          <p className="text-sm text-gray-400">No stops defined.</p>
        ) : (
          <ol className="space-y-2">
            {stops.map(stop => (
              <li key={stop.id} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{stop.stopOrder}</span>
                <div>
                  <span className="font-medium text-gray-900">{stop.city?.name}</span>
                  <span className="ml-2 text-gray-500">{stop.stopName}</span>
                  {(stop.arrivalOffset || stop.departureOffset) ? (
                    <span className="ml-2 text-xs text-gray-400">
                      +{stop.arrivalOffset ?? 0} / +{stop.departureOffset ?? 0} min
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
