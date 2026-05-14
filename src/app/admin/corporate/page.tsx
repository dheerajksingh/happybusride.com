"use client";

import { useEffect, useState } from "react";

const BUS_TYPES = ["AC_SEATER", "NON_AC_SEATER", "AC_SLEEPER", "NON_AC_SLEEPER", "LUXURY"];
const TIME_SLOTS = ["morning", "evening", "night", "all-day"];

interface PricingRule {
  id: string;
  city: string;
  state: string | null;
  busType: string | null;
  timeSlot: string | null;
  ratePerKm: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminCorporatePage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ city: "", state: "", busType: "", timeSlot: "", ratePerKm: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/corporate/pricing");
    if (res.ok) {
      const data = await res.json();
      setRules(data.rules);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/corporate/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: form.city,
        state: form.state || undefined,
        busType: form.busType || undefined,
        timeSlot: form.timeSlot || undefined,
        ratePerKm: parseFloat(form.ratePerKm),
      }),
    });
    setForm({ city: "", state: "", busType: "", timeSlot: "", ratePerKm: "" });
    setShowForm(false);
    await load();
    setSaving(false);
  }

  async function toggleRule(id: string, isActive: boolean) {
    await fetch("/api/admin/corporate/pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    await load();
  }

  const inputClass = "w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Corporate Charter Pricing</h1>
          <p className="mt-1 text-sm text-gray-400">Set per-km rates by city, bus type, and time of day. Used to suggest costs to corporate users.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          + Add Rule
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl bg-gray-800 p-5 space-y-4 border border-gray-700">
          <h2 className="font-semibold text-white">New Pricing Rule</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">City *</label>
              <input className={inputClass} required value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Bengaluru" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">State</label>
              <input className={inputClass} value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} placeholder="Karnataka" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Rate per KM (₹) *</label>
              <input type="number" step="0.5" className={inputClass} required value={form.ratePerKm} onChange={(e) => setForm((f) => ({ ...f, ratePerKm: e.target.value }))} placeholder="12.50" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Bus Type (optional)</label>
              <select className={inputClass} value={form.busType} onChange={(e) => setForm((f) => ({ ...f, busType: e.target.value }))}>
                <option value="">Any bus type</option>
                {BUS_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-400">Time Slot (optional)</label>
              <select className={inputClass} value={form.timeSlot} onChange={(e) => setForm((f) => ({ ...f, timeSlot: e.target.value }))}>
                <option value="">Any time</option>
                {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
              {saving ? "Saving…" : "Save Rule"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-400 hover:bg-gray-700">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl bg-gray-800 p-10 text-center">
          <p className="text-3xl mb-2">💰</p>
          <p className="text-gray-400">No pricing rules configured yet. Add rules to suggest costs to corporate users.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Bus Type</th>
                <th className="px-4 py-3">Time Slot</th>
                <th className="px-4 py-3">Rate / KM</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-gray-700 hover:bg-gray-750">
                  <td className="px-4 py-3 font-medium text-white">{rule.city}</td>
                  <td className="px-4 py-3 text-gray-400">{rule.state ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-300">{rule.busType?.replace(/_/g, " ") ?? "Any"}</td>
                  <td className="px-4 py-3 text-gray-300">{rule.timeSlot ?? "Any"}</td>
                  <td className="px-4 py-3 font-bold text-violet-400">₹{Number(rule.ratePerKm).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${rule.isActive ? "bg-green-900 text-green-400" : "bg-gray-700 text-gray-400"}`}>
                      {rule.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleRule(rule.id, rule.isActive)}
                      className="text-xs text-gray-400 hover:text-white"
                    >
                      {rule.isActive ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
