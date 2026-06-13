"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CityAutocomplete } from "@/components/ui/CityAutocomplete";
import type { City } from "@/components/ui/CityAutocomplete";

type IntermediateStop = { cityId: string; cityName: string; stopName: string; arrivalOffset: number; departureOffset: number };

export default function AdminNewRoutePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fromCity, setFromCity] = useState<City | null>(null);
  const [toCity, setToCity] = useState<City | null>(null);
  const [form, setForm] = useState({ name: "", distanceKm: "", durationMins: "" });
  const [distanceFetching, setDistanceFetching] = useState(false);
  const [distanceSource, setDistanceSource] = useState<string | null>(null);
  const [intermediates, setIntermediates] = useState<IntermediateStop[]>([]);

  async function fetchDistance(fromId: string, toId: string) {
    if (!fromId || !toId || fromId === toId) return;
    setDistanceFetching(true);
    setDistanceSource(null);
    try {
      const res = await fetch(`/api/distance?fromCityId=${fromId}&toCityId=${toId}`);
      if (res.ok) {
        const data = await res.json();
        setForm(f => ({ ...f, distanceKm: String(data.distanceKm), durationMins: String(data.durationMins) }));
        setDistanceSource(data.source);
      }
    } finally {
      setDistanceFetching(false);
    }
  }

  function addStop() {
    setIntermediates(prev => [...prev, { cityId: "", cityName: "", stopName: "", arrivalOffset: 0, departureOffset: 0 }]);
  }

  function updateStop(i: number, field: keyof IntermediateStop, value: string | number) {
    setIntermediates(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  function updateStopCity(i: number, city: City) {
    setIntermediates(prev => prev.map((s, idx) => idx === i
      ? { ...s, cityId: city.id, cityName: city.name, stopName: s.stopName || city.name }
      : s
    ));
  }

  function removeStop(i: number) {
    setIntermediates(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromCity || !toCity || !form.name) { alert("Fill all required fields"); return; }
    if (intermediates.some(s => !s.cityId)) { alert("Fill city for all intermediate stops"); return; }

    // Build full stops: from city (1) + intermediates + to city (last)
    const allStops = [
      { cityId: fromCity.id, stopName: `${fromCity.name} Bus Stand`, stopOrder: 1, arrivalOffset: 0, departureOffset: 0 },
      ...intermediates.map((s, i) => ({
        cityId: s.cityId,
        stopName: s.stopName || `${s.cityName} Bus Stand`,
        stopOrder: i + 2,
        arrivalOffset: s.arrivalOffset,
        departureOffset: s.departureOffset,
      })),
      {
        cityId: toCity.id,
        stopName: `${toCity.name} Bus Stand`,
        stopOrder: intermediates.length + 2,
        arrivalOffset: 0,
        departureOffset: 0,
      },
    ];

    setLoading(true);
    const res = await fetch("/api/admin/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromCityId: fromCity.id,
        toCityId: toCity.id,
        name: form.name,
        distanceKm: form.distanceKm ? Number(form.distanceKm) : undefined,
        durationMins: form.durationMins ? Number(form.durationMins) : undefined,
        stops: allStops,
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
          <CityAutocomplete
            label="From City *"
            value={fromCity ? `${fromCity.name}, ${fromCity.state}` : ""}
            onChange={(c) => { setFromCity(c); fetchDistance(c.id, toCity?.id ?? ""); }}
            placeholder="Origin city…"
          />
          <CityAutocomplete
            label="To City *"
            value={toCity ? `${toCity.name}, ${toCity.state}` : ""}
            onChange={(c) => { setToCity(c); fetchDistance(fromCity?.id ?? "", c.id); }}
            placeholder="Destination city…"
          />
        </div>

        <div>
          <label className={labelCls}>Route Name *</label>
          <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Patna - Ranchi Express" required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Distance (km)</label>
            <input type="number" min={1} className={inputCls} value={form.distanceKm} onChange={e => setForm(f => ({ ...f, distanceKm: e.target.value }))} placeholder="e.g. 250" />
            {distanceFetching && <p className="mt-1 text-xs text-blue-500">Calculating distance…</p>}
            {!distanceFetching && distanceSource && (
              <p className="mt-1 text-xs text-green-600">
                {distanceSource === "google" ? "✅ Via Google Maps" : "⚠️ Estimated"} — edit if needed
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Duration (mins)</label>
            <input type="number" min={1} className={inputCls} value={form.durationMins} onChange={e => setForm(f => ({ ...f, durationMins: e.target.value }))} placeholder="e.g. 300" />
          </div>
        </div>

        {/* Stops — from/to are fixed; only intermediate stops are added here */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Intermediate Stops</label>
            <button type="button" onClick={addStop} className="text-xs text-blue-600 hover:underline">+ Add Stop</button>
          </div>

          {/* Intermediate stops */}
          {intermediates.map((stop, i) => (
            <div key={i} className="mb-2 rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">{i + 2}</span>
                <button type="button" onClick={() => removeStop(i)} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <CityAutocomplete
                  label="City"
                  value={stop.cityName || ""}
                  onChange={(c) => updateStopCity(i, c)}
                  placeholder="Search city…"
                />
                <div>
                  <label className="mb-0.5 block text-xs text-gray-500">Stop Name</label>
                  <input className="w-full rounded border border-gray-200 p-1.5 text-xs" value={stop.stopName}
                    onChange={e => updateStop(i, "stopName", e.target.value)} placeholder="e.g. Nawada Bus Stand" />
                </div>
                <div>
                  <label className="mb-0.5 block text-xs text-gray-500">Arrival Offset (mins from departure)</label>
                  <input type="number" min={0} className="w-full rounded border border-gray-200 p-1.5 text-xs"
                    value={stop.arrivalOffset} onChange={e => updateStop(i, "arrivalOffset", Number(e.target.value))} />
                </div>
                <div>
                  <label className="mb-0.5 block text-xs text-gray-500">Departure Offset (mins from departure)</label>
                  <input type="number" min={0} className="w-full rounded border border-gray-200 p-1.5 text-xs"
                    value={stop.departureOffset} onChange={e => updateStop(i, "departureOffset", Number(e.target.value))} />
                </div>
              </div>
            </div>
          ))}

          {intermediates.length === 0 && (
            <p className="text-xs text-gray-400">No intermediate stops. The route goes directly from the origin to the destination.</p>
          )}
        </div>

        <Button type="submit" variant="primary" loading={loading} className="w-full">
          Create Route
        </Button>
      </form>
    </div>
  );
}
