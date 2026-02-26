"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";

type City = { id: string; name: string; state: string };

interface Stop {
  cityId: string;
  stopName: string;
  stopOrder: number;
  arrivalOffset?: number;
  departureOffset?: number;
}

export default function EditRoutePage() {
  const router = useRouter();
  const { routeId } = useParams<{ routeId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [hasActiveSchedules, setHasActiveSchedules] = useState(false);
  const [form, setForm] = useState({
    name: "",
    fromCityId: "",
    toCityId: "",
    distanceKm: "",
    durationMins: "",
  });
  const [stops, setStops] = useState<Stop[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/operator/routes/${routeId}`).then((r) => r.json()),
      fetch("/api/cities").then((r) => r.json()),
    ]).then(([route, cityList]) => {
      if (route && !route.error) {
        setForm({
          name: route.name,
          fromCityId: route.fromCityId,
          toCityId: route.toCityId,
          distanceKm: route.distanceKm ? String(route.distanceKm) : "",
          durationMins: route.durationMins ? String(route.durationMins) : "",
        });
        setStops(
          (route.stops ?? []).map((s: any) => ({
            cityId: s.cityId,
            stopName: s.stopName,
            stopOrder: s.stopOrder,
            arrivalOffset: s.arrivalOffset ?? undefined,
            departureOffset: s.departureOffset ?? undefined,
          }))
        );
        setHasActiveSchedules((route._count?.schedules ?? 0) > 0);
      }
      setCities(Array.isArray(cityList) ? cityList : []);
      setLoading(false);
    });
  }, [routeId]);

  function addStop() {
    setStops((s) => [
      ...s.slice(0, -1),
      { cityId: "", stopName: "", stopOrder: s.length, arrivalOffset: 0, departureOffset: 0 },
      { ...s[s.length - 1], stopOrder: s.length + 1 },
    ]);
  }

  function removeStop(idx: number) {
    if (stops.length <= 2) return;
    setStops((s) => s.filter((_, i) => i !== idx).map((stop, i) => ({ ...stop, stopOrder: i + 1 })));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setStops((s) => {
      const next = [...s];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next.map((stop, i) => ({ ...stop, stopOrder: i + 1 }));
    });
  }

  function moveDown(idx: number) {
    if (idx === stops.length - 1) return;
    setStops((s) => {
      const next = [...s];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next.map((stop, i) => ({ ...stop, stopOrder: i + 1 }));
    });
  }

  function updateStop(idx: number, field: keyof Stop, value: string | number) {
    setStops((s) => s.map((stop, i) => (i === idx ? { ...stop, [field]: value } : stop)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fromCityId || !form.toCityId) {
      alert("Select from and to cities");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/operator/routes/${routeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        distanceKm: form.distanceKm ? Number(form.distanceKm) : null,
        durationMins: form.durationMins ? Number(form.durationMins) : null,
        stops,
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/operator/routes");
    else alert("Failed to update route");
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-xl">
      <div className="mb-4">
        <Link href="/operator/routes" className="text-sm text-blue-600 hover:underline">
          ← Routes
        </Link>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Edit Route</h1>

      {hasActiveSchedules && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          This route has active schedules. Changing stops may affect existing trip data.
        </div>
      )}

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
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">From City</label>
              <select
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                value={form.fromCityId}
                onChange={(e) => setForm((f) => ({ ...f, fromCityId: e.target.value }))}
                required
              >
                <option value="">Select city</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">To City</label>
              <select
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                value={form.toCityId}
                onChange={(e) => setForm((f) => ({ ...f, toCityId: e.target.value }))}
                required
              >
                <option value="">Select city</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Distance (km)"
              type="number"
              placeholder="e.g. 1400"
              value={form.distanceKm}
              onChange={(e) => setForm((f) => ({ ...f, distanceKm: e.target.value }))}
            />
            <Input
              label="Duration (mins)"
              type="number"
              placeholder="e.g. 840"
              value={form.durationMins}
              onChange={(e) => setForm((f) => ({ ...f, durationMins: e.target.value }))}
            />
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Stops</h3>
            <button
              type="button"
              onClick={addStop}
              className="text-xs text-blue-600 hover:underline"
            >
              + Add Stop
            </button>
          </div>
          <div className="space-y-3">
            {stops.map((stop, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 mt-7">
                  {idx + 1}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">City</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                      value={stop.cityId}
                      onChange={(e) => updateStop(idx, "cityId", e.target.value)}
                    >
                      <option value="">Select city</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Stop Name</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                      placeholder="Bus stand name"
                      value={stop.stopName}
                      onChange={(e) => updateStop(idx, "stopName", e.target.value)}
                    />
                  </div>
                  {idx > 0 && (
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Arrival offset (mins)</label>
                      <input
                        type="number"
                        className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                        value={stop.arrivalOffset ?? ""}
                        onChange={(e) => updateStop(idx, "arrivalOffset", Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 mt-6">
                  <button
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs leading-none"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={idx === stops.length - 1}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs leading-none"
                    title="Move down"
                  >
                    ▼
                  </button>
                  {idx > 0 && idx < stops.length - 1 && (
                    <button
                      type="button"
                      onClick={() => removeStop(idx)}
                      className="text-gray-400 hover:text-red-500 text-xs leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" variant="primary" loading={saving} className="w-full">
          Save Route
        </Button>
      </form>
    </div>
  );
}
