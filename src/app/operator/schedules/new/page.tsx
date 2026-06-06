"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Suspense } from "react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type FreightSpace = { label: string; lengthCm: number; widthCm: number; heightCm: number };

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
  const [form, setForm] = useState({
    routeId: defaultRouteId,
    busId: "",
    driverId: "",
    departureTime: "2024-01-01T21:00",
    arrivalTime: "2024-01-02T07:00",
    baseFare: "",
  });

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/operator/routes?all=true").then((r) => r.json()),
      fetch("/api/operator/buses?available=true").then((r) => r.json()),
      fetch("/api/operator/drivers").then((r) => r.json()),
    ]).then(([r, b, d]) => {
      setRoutes(Array.isArray(r) ? r : []);
      setBuses(Array.isArray(b) ? b : []);
      setDrivers(Array.isArray(d) ? d : []);
    });
  }, []);

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
    const res = await fetch("/api/operator/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        driverId: form.driverId || undefined,
        baseFare: Number(form.baseFare),
        daysOfWeek,
        freightSpaces: freightSpaces.length > 0 ? freightSpaces : undefined,
      }),
    });
    setLoading(false);
    if (res.ok) router.push("/operator/schedules");
    else alert("Failed to create schedule");
  }

  return (
    <div className="max-w-lg">
      <div className="mb-4">
        <Link href="/operator/schedules" className="text-sm text-blue-600 hover:underline">← Schedules</Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">New Schedule</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
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
              <option key={b.id} value={b.id}>
                {b.name} ({b.registrationNo})
              </option>
            ))}
          </select>
          {buses.filter((b: any) => b.isActive).length === 0 && (
            <p className="mt-1 text-xs text-orange-600">All active buses are already scheduled or marked as charter-only.</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Default Driver</label>
          <select
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
            value={form.driverId}
            onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}
          >
            <option value="">Select driver (optional)</option>
            {drivers.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.user?.name} ({d.licenseNumber})
              </option>
            ))}
          </select>
        </div>

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
            <label className="mb-1 block text-sm font-medium text-gray-700">Arrival Time *</label>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
              value={form.arrivalTime}
              onChange={(e) => setForm((f) => ({ ...f, arrivalTime: e.target.value }))}
              required
            />
          </div>
        </div>

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

        {/* Freight spaces */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Freight Spaces</label>
            <button
              type="button"
              onClick={addFreightSpace}
              className="text-xs text-blue-600 hover:underline"
            >
              + Add Space
            </button>
          </div>
          {freightSpaces.length === 0 && (
            <p className="text-xs text-gray-400">No freight spaces defined. Click "Add Space" to define cargo capacity dimensions.</p>
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
