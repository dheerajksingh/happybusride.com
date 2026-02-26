"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";

const SEAT_TYPE_LABELS: Record<string, string> = {
  SEATER: "Seater",
  SLEEPER: "Sleeper",
  UPPER: "Upper",
  LOWER: "Lower",
};

const SEAT_TYPES = ["SEATER", "SLEEPER", "UPPER", "LOWER"];

export default function FaresPage() {
  const [fareRules, setFareRules] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [routeStops, setRouteStops] = useState<any[]>([]);
  const [form, setForm] = useState({
    scheduleId: "",
    seatType: "SEATER",
    price: "",
    segmentPricing: false,
    fromStopId: "",
    toStopId: "",
  });

  function loadFares() {
    return fetch("/api/operator/fares")
      .then((r) => r.json())
      .then((d) => setFareRules(Array.isArray(d) ? d : []));
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/operator/fares").then((r) => r.json()),
      fetch("/api/operator/schedules").then((r) => r.json()),
    ]).then(([fares, scheds]) => {
      setFareRules(Array.isArray(fares) ? fares : []);
      setSchedules(Array.isArray(scheds) ? scheds : []);
      setLoading(false);
    });
  }, []);

  // Load route stops when schedule is selected in modal
  useEffect(() => {
    if (!form.scheduleId) { setRouteStops([]); return; }
    const sched = schedules.find((s: any) => s.id === form.scheduleId);
    if (!sched) { setRouteStops([]); return; }
    fetch(`/api/operator/routes/${sched.routeId}`)
      .then((r) => r.json())
      .then((route) => setRouteStops(route?.stops ?? []));
  }, [form.scheduleId, schedules]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.scheduleId || !form.price) return;
    setSaving(true);
    const res = await fetch("/api/operator/fares", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduleId: form.scheduleId,
        seatType: form.seatType,
        price: Number(form.price),
        fromStopId: form.segmentPricing && form.fromStopId ? form.fromStopId : null,
        toStopId: form.segmentPricing && form.toStopId ? form.toStopId : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowModal(false);
      setForm({ scheduleId: "", seatType: "SEATER", price: "", segmentPricing: false, fromStopId: "", toStopId: "" });
      loadFares();
    } else {
      const err = await res.json();
      alert(err.error ?? "Failed to create fare rule");
    }
  }

  async function handleUpdatePrice(id: string) {
    if (!editPrice) return;
    await fetch("/api/operator/fares", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, price: Number(editPrice) }),
    });
    setEditingId(null);
    loadFares();
  }

  async function handleToggleActive(rule: any) {
    await fetch("/api/operator/fares", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, isActive: !rule.isActive }),
    });
    loadFares();
  }

  // Group rules by schedule
  const grouped: Record<string, any[]> = {};
  for (const rule of fareRules) {
    const key = rule.scheduleId;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(rule);
  }

  if (loading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Fare Rules</h1>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          + Add Fare Rule
        </Button>
      </div>

      {fareRules.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="mb-2 text-4xl">💲</p>
          <h3 className="font-semibold text-gray-900">No fare rules yet</h3>
          <p className="mt-1 text-sm text-gray-500">Add pricing rules per seat type for your schedules.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([scheduleId, rules]) => {
            const sched = rules[0]?.schedule;
            return (
              <div key={scheduleId} className="rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-3 bg-gray-50">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {sched?.route?.fromCity?.name} → {sched?.route?.toCity?.name}
                  </h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                      <th className="px-4 py-2">Seat Type</th>
                      <th className="px-4 py-2">Segment</th>
                      <th className="px-4 py-2">Price</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => (
                      <tr key={rule.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">
                          {SEAT_TYPE_LABELS[rule.seatType] ?? rule.seatType}
                        </td>
                        <td className="px-4 py-2 text-gray-500 text-xs">
                          {rule.fromStop && rule.toStop
                            ? `${rule.fromStop.stopName} → ${rule.toStop.stopName}`
                            : "Full route"}
                        </td>
                        <td className="px-4 py-2">
                          {editingId === rule.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                className="w-20 rounded border border-gray-300 p-1 text-sm"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdatePrice(rule.id)}
                                className="text-xs text-green-600 hover:underline"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="text-xs text-gray-400 hover:underline"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <span className="font-medium text-gray-900">
                              ₹{Number(rule.price).toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant={rule.isActive ? "success" : "default"}>
                            {rule.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-3">
                            {editingId !== rule.id && (
                              <button
                                onClick={() => { setEditingId(rule.id); setEditPrice(String(Number(rule.price))); }}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Edit Price
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleActive(rule)}
                              className="text-xs text-gray-500 hover:underline"
                            >
                              {rule.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Fare Rule"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={(e: any) => handleCreate(e)}>
              Create Rule
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Schedule *</label>
            <select
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
              value={form.scheduleId}
              onChange={(e) => setForm((f) => ({ ...f, scheduleId: e.target.value }))}
              required
            >
              <option value="">Select schedule</option>
              {schedules.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.route?.fromCity?.name} → {s.route?.toCity?.name} ({s.bus?.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Seat Type *</label>
            <select
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
              value={form.seatType}
              onChange={(e) => setForm((f) => ({ ...f, seatType: e.target.value }))}
            >
              {SEAT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {SEAT_TYPE_LABELS[t] ?? t}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Price (₹) *"
            type="number"
            min={1}
            placeholder="e.g. 800"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            required
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.segmentPricing}
              onChange={(e) => setForm((f) => ({ ...f, segmentPricing: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Segment pricing (specific stop range)</span>
          </label>

          {form.segmentPricing && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">From Stop</label>
                <select
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                  value={form.fromStopId}
                  onChange={(e) => setForm((f) => ({ ...f, fromStopId: e.target.value }))}
                >
                  <option value="">Select stop</option>
                  {routeStops.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.stopName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">To Stop</label>
                <select
                  className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                  value={form.toStopId}
                  onChange={(e) => setForm((f) => ({ ...f, toStopId: e.target.value }))}
                >
                  <option value="">Select stop</option>
                  {routeStops.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.stopName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
