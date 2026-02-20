"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageSpinner } from "@/components/ui/Spinner";

export default function AdminPricingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    defaultRate: 10,
    minCommission: 0,
    maxCommission: 500,
    gstRate: 18,
  });

  useEffect(() => {
    fetch("/api/admin/pricing")
      .then((r) => r.json())
      .then((rule) => {
        if (rule) setForm({
          defaultRate: Number(rule.defaultRate),
          minCommission: Number(rule.minCommission),
          maxCommission: Number(rule.maxCommission),
          gstRate: Number(rule.gstRate),
        });
        setLoading(false);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    else alert("Failed to save");
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="max-w-lg">
      <h1 className="mb-2 text-2xl font-bold text-white">Commission & Pricing</h1>
      <p className="mb-6 text-sm text-gray-400">
        These rates apply to all new bookings. Existing bookings are not affected.
      </p>

      {saved && (
        <div className="mb-4 rounded-lg bg-green-900/50 p-3 text-sm font-medium text-green-300">
          ✓ Settings saved successfully
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-xl bg-gray-800 p-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Platform Commission Rate (%)</label>
          <input
            type="number"
            step="0.5"
            min={0}
            max={50}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white"
            value={form.defaultRate}
            onChange={(e) => setForm((f) => ({ ...f, defaultRate: Number(e.target.value) }))}
          />
          <p className="mt-1 text-xs text-gray-500">Percentage of gross fare charged as platform fee</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Min Commission (₹)</label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white"
              value={form.minCommission}
              onChange={(e) => setForm((f) => ({ ...f, minCommission: Number(e.target.value) }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Max Commission (₹)</label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white"
              value={form.maxCommission}
              onChange={(e) => setForm((f) => ({ ...f, maxCommission: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">GST on Commission (%)</label>
          <input
            type="number"
            step="0.5"
            min={0}
            max={30}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white"
            value={form.gstRate}
            onChange={(e) => setForm((f) => ({ ...f, gstRate: Number(e.target.value) }))}
          />
          <p className="mt-1 text-xs text-gray-500">GST applied on top of commission amount</p>
        </div>

        <div className="rounded-lg bg-gray-700 p-3 text-sm text-gray-300">
          <p className="font-medium text-white">Example Calculation</p>
          <p className="mt-1 text-xs">
            Booking fare: ₹1,000 → Commission: ₹{(1000 * form.defaultRate / 100).toFixed(0)} →
            GST on commission: ₹{(1000 * form.defaultRate / 100 * form.gstRate / 100).toFixed(0)} →
            Operator gets: ₹{(1000 - 1000 * form.defaultRate / 100 * (1 + form.gstRate / 100)).toFixed(0)}
          </p>
        </div>

        <Button type="submit" variant="primary" loading={saving} className="w-full">
          Save Settings
        </Button>
      </form>
    </div>
  );
}
