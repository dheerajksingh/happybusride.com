"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BUS_TYPE_LABELS } from "@/constants/config";

const AMENITY_OPTIONS = [
  { key: "wifi", label: "WiFi" },
  { key: "charging", label: "Charging Points" },
  { key: "blanket", label: "Blanket & Pillow" },
  { key: "water", label: "Water Bottle" },
  { key: "tv", label: "TV/Screen" },
  { key: "ac", label: "Air Conditioning" },
  { key: "toilet", label: "Toilet" },
];

export default function NewBusPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    registrationNo: "",
    busType: "AC_SEATER",
    totalSeats: 40,
    amenities: [] as string[],
  });

  function toggleAmenity(key: string) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(key)
        ? f.amenities.filter((a) => a !== key)
        : [...f.amenities, key],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/operator/buses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, totalSeats: Number(form.totalSeats) }),
    });
    if (res.ok) {
      const bus = await res.json();
      router.push(`/operator/buses/${bus.id}/layout`);
    } else {
      alert("Failed to create bus");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-4">
        <Link href="/operator/buses" className="text-sm text-blue-600 hover:underline">← Bus Fleet</Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Add New Bus</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <Input
          label="Bus Name / Nickname"
          placeholder="e.g. Volvo Express 1"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
        <Input
          label="Registration Number"
          placeholder="e.g. MH01AB1234"
          value={form.registrationNo}
          onChange={(e) => setForm((f) => ({ ...f, registrationNo: e.target.value }))}
          required
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Bus Type</label>
          <select
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
            value={form.busType}
            onChange={(e) => setForm((f) => ({ ...f, busType: e.target.value }))}
          >
            {Object.entries(BUS_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <Input
          label="Total Seats"
          type="number"
          min={1}
          max={60}
          value={form.totalSeats}
          onChange={(e) => setForm((f) => ({ ...f, totalSeats: Number(e.target.value) }))}
          required
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Amenities</label>
          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => toggleAmenity(a.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  form.amenities.includes(a.key)
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" loading={loading} className="flex-1">
            Create Bus & Set Layout →
          </Button>
        </div>
      </form>
    </div>
  );
}
