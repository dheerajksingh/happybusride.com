"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CityAutocomplete } from "@/components/ui/CityAutocomplete";

interface Stop {
  cityId: string;
  cityName: string;
  stopName: string;
  stopOrder: number;
  arrivalOffset?: number;
  departureOffset?: number;
}

export default function NewRoutePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [distanceFetching, setDistanceFetching] = useState(false);
  const [distanceSource, setDistanceSource] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    fromCityId: "", fromCityName: "",
    toCityId: "", toCityName: "",
    distanceKm: "",
    durationMins: "",
  });

  async function fetchDistance(fromCityId: string, toCityId: string) {
    if (!fromCityId || !toCityId || fromCityId === toCityId) return;
    setDistanceFetching(true);
    setDistanceSource(null);
    try {
      const res = await fetch(`/api/operator/routes/distance?fromCityId=${fromCityId}&toCityId=${toCityId}`);
      if (res.ok) {
        const data = await res.json();
        setForm(f => ({ ...f, distanceKm: String(data.distanceKm), durationMins: String(data.durationMins) }));
        setDistanceSource(data.source);
      }
    } finally {
      setDistanceFetching(false);
    }
  }
  const [stops, setStops] = useState<Stop[]>([
    { cityId: "", cityName: "", stopName: "", stopOrder: 1, departureOffset: 0 },
    { cityId: "", cityName: "", stopName: "", stopOrder: 2, arrivalOffset: 0 },
  ]);

  function addStop() {
    setStops((s) => [
      ...s.slice(0, -1),
      { cityId: "", cityName: "", stopName: "", stopOrder: s.length, arrivalOffset: 0, departureOffset: 0 },
      { ...s[s.length - 1], stopOrder: s.length + 1 },
    ]);
  }

  function removeStop(idx: number) {
    if (stops.length <= 2) return;
    setStops((s) => s.filter((_, i) => i !== idx).map((stop, i) => ({ ...stop, stopOrder: i + 1 })));
  }

  function updateStop(idx: number, field: keyof Stop, value: string | number) {
    setStops((s) => s.map((stop, i) => i === idx ? { ...stop, [field]: value } : stop));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fromCityId || !form.toCityId) { alert("Select from and to cities"); return; }

    const finalStops = stops.map((stop, idx) => ({
      ...stop,
      cityId: idx === 0 && !stop.cityId ? form.fromCityId : idx === stops.length - 1 && !stop.cityId ? form.toCityId : stop.cityId,
      stopName: stop.stopName || (idx === 0 ? form.fromCityName : idx === stops.length - 1 ? form.toCityName : stop.cityName),
    }));

    setLoading(true);
    const res = await fetch("/api/operator/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        fromCityId: form.fromCityId,
        toCityId: form.toCityId,
        distanceKm: form.distanceKm ? Number(form.distanceKm) : undefined,
        durationMins: form.durationMins ? Number(form.durationMins) : undefined,
        stops: finalStops,
      }),
    });
    setLoading(false);
    if (res.ok) router.push("/operator/routes");
    else alert("Failed to create route");
  }

  return (
    <div className="max-w-xl">
      <div className="mb-4">
        <Link href="/operator/routes" className="text-sm text-blue-600 hover:underline">← Routes</Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Route</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
          <Input
            label="Route Name"
            placeholder="e.g. Delhi - Mumbai Express"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <CityAutocomplete
              label="From City"
              value={form.fromCityName}
              onChange={(c) => {
                setForm((f) => ({ ...f, fromCityId: c.id, fromCityName: c.name }));
                fetchDistance(c.id, form.toCityId);
              }}
              placeholder="Search city…"
            />
            <CityAutocomplete
              label="To City"
              value={form.toCityName}
              onChange={(c) => {
                setForm((f) => ({ ...f, toCityId: c.id, toCityName: c.name }));
                fetchDistance(form.fromCityId, c.id);
              }}
              placeholder="Search city…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input label="Distance (km)" type="number" placeholder="e.g. 1400" value={form.distanceKm}
                onChange={(e) => setForm((f) => ({ ...f, distanceKm: e.target.value }))} />
              {distanceFetching && <p className="mt-1 text-xs text-blue-500">Calculating road distance…</p>}
              {!distanceFetching && distanceSource && (
                <p className="mt-1 text-xs text-green-600">
                  {distanceSource === "google" ? "✅ Via Google Maps" : "⚠️ Estimated (no Google Maps key)"} — edit if needed
                </p>
              )}
            </div>
            <Input label="Duration (mins)" type="number" placeholder="e.g. 840" value={form.durationMins}
              onChange={(e) => setForm((f) => ({ ...f, durationMins: e.target.value }))} />
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Stops</h3>
            <button type="button" onClick={addStop} className="text-xs text-blue-600 hover:underline">+ Add Stop</button>
          </div>
          <div className="space-y-3">
            {stops.map((stop, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 mt-6">
                  {idx + 1}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <CityAutocomplete
                    value={stop.cityName}
                    onChange={(c) => { updateStop(idx, "cityId", c.id); updateStop(idx, "cityName", c.name); }}
                    placeholder="Search city…"
                  />
                  <div>
                    <input
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm mt-0"
                      placeholder="Stop name (bus stand)"
                      value={stop.stopName}
                      onChange={(e) => updateStop(idx, "stopName", e.target.value)}
                    />
                  </div>
                  {idx > 0 && (
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Arrival offset (mins)</label>
                      <input type="number" className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                        value={stop.arrivalOffset ?? ""} onChange={(e) => updateStop(idx, "arrivalOffset", Number(e.target.value))} />
                    </div>
                  )}
                </div>
                {idx > 0 && idx < stops.length - 1 && (
                  <button type="button" onClick={() => removeStop(idx)} className="mt-6 text-gray-400 hover:text-red-500">×</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" variant="primary" loading={loading} className="w-full">Create Route</Button>
      </form>
    </div>
  );
}
