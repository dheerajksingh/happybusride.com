"use client";

import { useEffect, useState } from "react";

const STATUS_STYLE: Record<string, string> = {
  PENDING:   "bg-yellow-900/40 text-yellow-400",
  APPROVED:  "bg-green-900/40 text-green-400",
  REJECTED:  "bg-red-900/40 text-red-400",
  SUSPENDED: "bg-gray-700 text-gray-400",
};

export default function AdminShuttleOperatorsPage() {
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/shuttle-operators").then(r => r.json()).then(d => {
      setOperators(d.operators ?? []);
      setLoading(false);
    });
  }, []);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    const res = await fetch(`/api/admin/shuttle-operators/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setOperators(prev => prev.map(op => op.id === id ? { ...op, status } : op));
    }
    setUpdating(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Shuttle Operators</h1>
        <p className="mt-1 text-sm text-gray-400">Manage shuttle operator registrations and status.</p>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : operators.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No shuttle operators registered yet.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-900 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-3">Operator</th>
                <th className="px-5 py-3">City</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Vehicles</th>
                <th className="px-5 py-3">Bookings</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {operators.map(op => (
                <tr key={op.id} className="hover:bg-gray-700/30">
                  <td className="px-5 py-4">
                    <div className="font-medium text-white">{op.fullName}</div>
                    <div className="text-xs text-gray-400">{op.email}</div>
                  </td>
                  <td className="px-5 py-4 text-gray-300">{op.city?.name}, {op.city?.state}</td>
                  <td className="px-5 py-4 text-gray-300">{op.phone}</td>
                  <td className="px-5 py-4 text-gray-300">{op._count?.vehicles ?? 0}</td>
                  <td className="px-5 py-4 text-gray-300">{op._count?.bookings ?? 0}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[op.status] ?? ""}`}>
                      {op.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      {op.status !== "APPROVED" && (
                        <button
                          disabled={updating === op.id}
                          onClick={() => updateStatus(op.id, "APPROVED")}
                          className="rounded bg-green-700 px-2 py-1 text-xs text-white hover:bg-green-600 disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                      {op.status !== "SUSPENDED" && op.status !== "REJECTED" && (
                        <button
                          disabled={updating === op.id}
                          onClick={() => updateStatus(op.id, "SUSPENDED")}
                          className="rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-500 disabled:opacity-50"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
