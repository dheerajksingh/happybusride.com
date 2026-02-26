"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function EditSchedulePage() {
  const router = useRouter();
  const { scheduleId } = useParams<{ scheduleId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [form, setForm] = useState({
    routeId: "",
    busId: "",
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
      fetch("/api/operator/routes").then((r) => r.json()),
      fetch("/api/operator/buses").then((r) => r.json()),
    ]).then(([s, r, b]) => {
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
          departureTime: toLocal(dep),
          arrivalTime: toLocal(arr),
          baseFare: String(Number(s.baseFare)),
          isActive: s.isActive,
        });
        setDaysOfWeek(s.daysOfWeek ?? []);
      }
      setRoutes(Array.isArray(r) ? r : []);
      setBuses(Array.isArray(b) ? b : []);
      setLoading(false);
    });
  }, [scheduleId]);

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/operator/schedules/${scheduleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        baseFare: Number(form.baseFare),
        daysOfWeek,
        regenerateTrips,
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
            <option value="">Select bus</option>
            {buses.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.registrationNo})
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
