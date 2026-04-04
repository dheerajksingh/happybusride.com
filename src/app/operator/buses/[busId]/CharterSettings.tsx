"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface CharterSettingsProps {
  busId: string;
}

interface CharterData {
  isCharterAvailable: boolean;
  charterRatePerDay: number | null;
  charterRatePerKm: number | null;
  charterDepositPercent: number | null;
  charterCancelPolicy: string | null;
}

export default function CharterSettings({ busId }: CharterSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<CharterData>({
    isCharterAvailable: false,
    charterRatePerDay: null,
    charterRatePerKm: null,
    charterDepositPercent: null,
    charterCancelPolicy: null,
  });

  useEffect(() => {
    fetch(`/api/operator/buses/${busId}/charter`)
      .then((r) => r.json())
      .then((d) => setForm({
        isCharterAvailable: d.isCharterAvailable ?? false,
        charterRatePerDay: d.charterRatePerDay ?? null,
        charterRatePerKm: d.charterRatePerKm ?? null,
        charterDepositPercent: d.charterDepositPercent ?? null,
        charterCancelPolicy: d.charterCancelPolicy ?? null,
      }))
      .finally(() => setLoading(false));
  }, [busId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");

    const res = await fetch(`/api/operator/buses/${busId}/charter`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isCharterAvailable: form.isCharterAvailable,
        charterRatePerDay: form.charterRatePerDay ?? undefined,
        charterRatePerKm: form.charterRatePerKm ?? undefined,
        charterDepositPercent: form.charterDepositPercent ?? undefined,
        charterCancelPolicy: form.charterCancelPolicy ?? undefined,
      }),
    });

    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json();
      setError(d.error ?? "Failed to save charter settings");
    }
  }

  if (loading) return <div className="mt-6 rounded-xl bg-white p-6 shadow-sm text-sm text-gray-500">Loading charter settings…</div>;

  return (
    <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Charter Settings</h2>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isCharterAvailable"
            checked={form.isCharterAvailable}
            onChange={(e) => setForm((f) => ({ ...f, isCharterAvailable: e.target.checked }))}
            className="h-4 w-4 rounded"
          />
          <label htmlFor="isCharterAvailable" className="text-sm font-medium text-gray-700">
            Available for charter bookings
          </label>
        </div>

        {form.isCharterAvailable && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Rate per Day (₹)"
                type="number"
                min={100}
                step={100}
                value={form.charterRatePerDay ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, charterRatePerDay: e.target.value ? Number(e.target.value) : null }))}
                placeholder="e.g. 2000"
                required={form.isCharterAvailable}
              />
              <Input
                label="Rate per Km (₹)"
                type="number"
                min={1}
                step={0.5}
                value={form.charterRatePerKm ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, charterRatePerKm: e.target.value ? Number(e.target.value) : null }))}
                placeholder="e.g. 15"
                required={form.isCharterAvailable}
              />
            </div>

            <Input
              label="Deposit % (10–100)"
              type="number"
              min={10}
              max={100}
              value={form.charterDepositPercent ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, charterDepositPercent: e.target.value ? Number(e.target.value) : null }))}
              placeholder="e.g. 30"
              required={form.isCharterAvailable}
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Cancellation Policy</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                rows={3}
                placeholder="e.g. 50% refund if cancelled 48h before start date. No refund after that."
                value={form.charterCancelPolicy ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, charterCancelPolicy: e.target.value || null }))}
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
        {saved && <p className="text-sm text-green-600">Charter settings saved!</p>}

        <Button type="submit" variant="primary" loading={saving}>
          Save Charter Settings
        </Button>
      </form>
    </div>
  );
}
