"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";

const TYPE_STYLES: Record<string, { variant: "info" | "default" | "danger" | "success"; label: string }> = {
  SERVICE:    { variant: "info",    label: "Service" },
  INSPECTION: { variant: "default", label: "Inspection" },
  REPAIR:     { variant: "danger",  label: "Repair" },
  CLEANING:   { variant: "success", label: "Cleaning" },
};

const MAINTENANCE_TYPES = ["SERVICE", "INSPECTION", "REPAIR", "CLEANING"];

export default function MaintenancePage() {
  const { busId } = useParams<{ busId: string }>();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: "SERVICE",
    description: "",
    mileage: "",
    cost: "",
    nextServiceDue: "",
  });

  function loadLogs() {
    return fetch(`/api/operator/buses/${busId}/maintenance`)
      .then((r) => r.json())
      .then((d) => setLogs(Array.isArray(d) ? d : []));
  }

  useEffect(() => {
    loadLogs().finally(() => setLoading(false));
  }, [busId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/operator/buses/${busId}/maintenance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.date,
        type: form.type,
        description: form.description,
        mileage: form.mileage ? Number(form.mileage) : undefined,
        cost: form.cost ? Number(form.cost) : undefined,
        nextServiceDue: form.nextServiceDue || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowModal(false);
      setForm({ date: new Date().toISOString().slice(0, 10), type: "SERVICE", description: "", mileage: "", cost: "", nextServiceDue: "" });
      loadLogs();
    } else {
      alert("Failed to save log");
    }
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  if (loading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-4">
        <Link href="/operator/buses" className="text-sm text-blue-600 hover:underline">
          ← Bus Fleet
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Maintenance Logs</h1>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          + Add Log
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="mb-2 text-4xl">🔧</p>
          <h3 className="font-semibold text-gray-900">No maintenance logs yet</h3>
          <p className="mt-1 text-sm text-gray-500">Start tracking your bus maintenance history.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Mileage</th>
                <th className="px-4 py-3">Cost</th>
                <th className="px-4 py-3">Next Service</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{fmtDate(log.date)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={TYPE_STYLES[log.type]?.variant ?? "default"}>
                      {TYPE_STYLES[log.type]?.label ?? log.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{log.description}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.mileage ? `${log.mileage.toLocaleString()} km` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.cost ? `₹${Number(log.cost).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {log.nextServiceDue ? fmtDate(log.nextServiceDue) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Maintenance Log"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={(e: any) => handleSubmit(e)}>
              Save Log
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Date *</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Type *</label>
              <select
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                {MAINTENANCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_STYLES[t]?.label ?? t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Description *</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
              rows={2}
              placeholder="Describe the work done..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Mileage (km)"
              type="number"
              placeholder="e.g. 45000"
              value={form.mileage}
              onChange={(e) => setForm((f) => ({ ...f, mileage: e.target.value }))}
            />
            <Input
              label="Cost (₹)"
              type="number"
              placeholder="e.g. 2500"
              value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Next Service Due</label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
              value={form.nextServiceDue}
              onChange={(e) => setForm((f) => ({ ...f, nextServiceDue: e.target.value }))}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
