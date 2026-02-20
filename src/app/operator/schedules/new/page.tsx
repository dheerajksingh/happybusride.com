"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Suspense } from "react";

function NewScheduleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRouteId = searchParams.get("routeId") ?? "";

  const [routes, setRoutes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    routeId: defaultRouteId,
    busId: "",
    departureTime: "2024-01-01T21:00",
    arrivalTime: "2024-01-02T07:00",
    baseFare: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/operator/routes").then((r) => r.json()),
      fetch("/api/operator/buses").then((r) => r.json()),
    ]).then(([r, b]) => {
      setRoutes(Array.isArray(r) ? r : []);
      setBuses(Array.isArray(b) ? b : []);
    });
  }, []);

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
        baseFare: Number(form.baseFare),
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
            <option value="">Select bus</option>
            {buses.filter((b: any) => b.isActive).map((b: any) => (
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

        <p className="text-xs text-gray-400">
          Trips will be auto-generated for the next 30 days once you create this schedule.
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
