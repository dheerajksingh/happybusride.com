"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

type Stop = { cityId: string; stopName: string; stopOrder: number; arrivalOffset: number; departureOffset: number };

export default function AdminNewRoutePage() {
  const router = useRouter();
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ fromCityId: "", toCityId: "", name: "", distanceKm: "", durationMins: "" });
  const [stops, setStops] = useState<Stop[]>([]);

  useEffect(() => {
    fetch("/api/cities?limit=500").then(r => r.json()).then(d => setCities(Array.isArray(d) ? d : []));
  }, []);

  function addStop() {
    setStops(prev => [...prev, {
      cityId: "",
      stopName: "",
      stopOrder: prev.length + 1,
      arrivalOffset: 0,
      departureOffset: 0,
    }]);
  }

  function updateStop(i: number, field: keyof Stop, value: string | number) {
    setStops(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  function removeStop(i: number) {
    setStops(prev => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, stopOrder: idx + 1 })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fromCityId || !form.toCityId || !form.name) { alert("Fill all required fields"); return; }
    if (stops.length < 2) { alert("Add at least 2 stops (origin + destination)"); return; }
    if (stops.some(s => !s.cityId || !s.stopName)) { alert("Fill all stop details"); return; }

    setLoading(true);
    const res = await fetch("/api/admin/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        distanceKm: form.distanceKm ? Number(form.distanceKm) : undefined,
        durationMins: form.durationMins ? Number(form.durationMins) : undefined,
        stops,
      }),
    });
    setLoading(false);
    if (res.ok) router.push("/admin/routes");
    else { const d = await res.json(); alert(d.error ?? "Failed to create route"); }
  }

  const inputCls = "w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-blue-500 focus:outline-none";
  const labelCls = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/admin/routes" className="text-sm text-blue-600 hover:underline">← Routes</Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Route</h1>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>From City *</label>
            <select className={inputCls} value={form.fromCityId} onChange={e => setForm(f => ({ ...f, fromCityId: e.target.value }))} required>
              <option value="">Select city</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>To City *</label>
            <select className={inputCls} value={form.toCityId} onChange={e => setForm(f => ({ ...f, toCityId: e.target.value }))} required>
              <option value="">Select city</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Route Name *</label>
          <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mumbai-Pune Express" required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Distance (km)</label>
            <input type="number" min={1} className={inputCls} value={form.distanceKm} onChange={e => setForm(f => ({ ...f, distanceKm: e.target.value }))} placeholder="e.g. 150" />
          </div>
          <div>
            <label className={labelCls}>Duration (mins)</label>
            <input type="number" min={1} className={inputCls} value={form.durationMins} onChange={e => setForm(f => ({ ...f, durationMins: e.target.value }))} placeholder="e.g. 180" />
          </div>
        </div>

        {/* Stops */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Stops * (min 2)</label>
            <button type="button" onClick={addStop} className="text-xs text-blue-600 hover:underline">+ Add Stop</button>
          </div>
          {stops.length === 0 && (
            <p className="text-xs text-gray-400">Add at least an origin and destination stop.</p>
          )}
          {stops.map((stop, i) => (
            <div key={i} className="mb-2 rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">Stop {stop.stopOrder}</span>
                <button type="button" onClick={() => removeStop(i)} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-0.5 block text-xs text-gray-500">City</label>
                  <select className="w-full rounded border border-gray-200 p-1.5 text-xs" value={stop.cityId} onChange={e => updateStop(i, "cityId", e.target.value)}>
                    <option value="">Select city</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-0.5 block text-xs text-gray-500">Stop Name</label>
                  <input className="w-full rounded border border-gray-200 p-1.5 text-xs" value={stop.stopName} onChange={e => updateStop(i, "stopName", e.target.value)} placeholder="e.g. Central Bus Stand" />
                </div>
                <div>
                  <label className="mb-0.5 block text-xs text-gray-500">Arrival Offset (mins)</label>
                  <input type="number" min={0} className="w-full rounded border border-gray-200 p-1.5 text-xs" value={stop.arrivalOffset} onChange={e => updateStop(i, "arrivalOffset", Number(e.target.value))} />
                </div>
                <div>
                  <label className="mb-0.5 block text-xs text-gray-500">Departure Offset (mins)</label>
                  <input type="number" min={0} className="w-full rounded border border-gray-200 p-1.5 text-xs" value={stop.departureOffset} onChange={e => updateStop(i, "departureOffset", Number(e.target.value))} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button type="submit" variant="primary" loading={loading} className="w-full">
          Create Route
        </Button>
      </form>
    </div>
  );
}
