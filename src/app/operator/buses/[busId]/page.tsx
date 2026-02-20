"use client";

import { use, useEffect, useState } from "react";
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

export default function EditBusPage({ params }: { params: Promise<{ busId: string }> }) {
  const { busId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    registrationNo: "",
    busType: "AC_SEATER",
    totalSeats: 40,
    amenities: [] as string[],
    isActive: true,
  });

  useEffect(() => {
    fetch(`/api/operator/buses/${busId}`)
      .then((r) => r.json())
      .then((bus) => {
        if (bus) setForm({
          name: bus.name,
          registrationNo: bus.registrationNo,
          busType: bus.busType,
          totalSeats: bus.totalSeats,
          amenities: bus.amenities ?? [],
          isActive: bus.isActive,
        });
      })
      .finally(() => setLoading(false));
    setLoading(true);
  }, [busId]);

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
    setSaving(true);
    const res = await fetch(`/api/operator/buses/${busId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, totalSeats: Number(form.totalSeats) }),
    });
    setSaving(false);
    if (res.ok) router.push("/operator/buses");
    else alert("Failed to update bus");
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="max-w-xl">
      <div className="mb-4">
        <Link href="/operator/buses" className="text-sm text-blue-600 hover:underline">← Bus Fleet</Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit Bus</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <Input
          label="Bus Name / Nickname"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
        <Input
          label="Registration Number"
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
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            className="h-4 w-4"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">Bus is active</label>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" loading={saving} className="flex-1">Save Changes</Button>
          <Link
            href={`/operator/buses/${busId}/layout`}
            className="flex-1 rounded-lg border border-blue-200 py-2 text-center text-sm font-medium text-blue-600 hover:bg-blue-50"
          >
            Edit Seat Layout
          </Link>
        </div>
      </form>
    </div>
  );
}
