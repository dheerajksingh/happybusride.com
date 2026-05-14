"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { signOut } from "next-auth/react";

const STATUS_STYLE: Record<string, string> = {
  DRAFT:     "bg-gray-100 text-gray-600",
  SUBMITTED: "bg-blue-100 text-blue-700",
  QUOTED:    "bg-yellow-100 text-yellow-700",
  ACCEPTED:  "bg-green-100 text-green-700",
  ACTIVE:    "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-red-100 text-red-600",
};

const BUS_TYPES = [
  { value: "", label: "Any type" },
  { value: "AC_SEATER", label: "AC Seater" },
  { value: "NON_AC_SEATER", label: "Non-AC Seater" },
  { value: "AC_SLEEPER", label: "AC Sleeper" },
  { value: "NON_AC_SLEEPER", label: "Non-AC Sleeper" },
  { value: "LUXURY", label: "Luxury" },
];

const CAPACITY_OPTIONS = [
  { value: "", label: "Any size" },
  { value: "12",  label: "Mini (12)" },
  { value: "40",  label: "Mid (40)" },
  { value: "50",  label: "Large (50)" },
  { value: "70",  label: "Double decker (70)" },
];

interface Request {
  id: string;
  city: string;
  state: string;
  officeAddress: string;
  arrivalTime: string;
  departureTime: string;
  maxTravelMins: number | null;
  clusterRadiusKm: number | string | null;
  startDate: string;
  busType: string | null;
  seatCapacityMin: number | null;
  hasAc: boolean;
  hasWifi: boolean;
  notes: string | null;
  status: string;
  createdAt: string;
  _count: { employees: number; bids: number };
}

type SortKey = "createdAt" | "startDate" | "status";

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none";

export default function CorporateDashboardPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Request>>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/corporate/requests");
    if (res.ok) {
      const data = await res.json();
      setRequests(data.requests);
      setCompanyName(data.requests[0]?.company?.name ?? "");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ── sort ──────────────────────────────────────────────────────
  const sorted = [...requests].sort((a, b) => {
    if (sortKey === "createdAt") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortKey === "startDate") return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    return a.status.localeCompare(b.status);
  });

  // ── stats ─────────────────────────────────────────────────────
  const active  = requests.filter(r => ["ACTIVE","ACCEPTED"].includes(r.status)).length;
  const pending = requests.filter(r => ["SUBMITTED","QUOTED"].includes(r.status)).length;

  // ── edit helpers ──────────────────────────────────────────────
  function startEdit(r: Request) {
    setEditingId(r.id);
    setEditForm({
      city: r.city, state: r.state,
      officeAddress: r.officeAddress,
      arrivalTime: r.arrivalTime, departureTime: r.departureTime,
      maxTravelMins: r.maxTravelMins ?? undefined,
      clusterRadiusKm: r.clusterRadiusKm ? Number(r.clusterRadiusKm) : 1.5,
      startDate: r.startDate.slice(0, 10),
      busType: r.busType ?? "",
      seatCapacityMin: r.seatCapacityMin ?? undefined,
      hasAc: r.hasAc, hasWifi: r.hasWifi,
      notes: r.notes ?? "",
    });
    setError("");
  }

  function upd(field: string, value: any) {
    setEditForm(f => ({ ...f, [field]: value }));
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    const res = await fetch(`/api/corporate/requests/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        busType: editForm.busType || null,
        seatCapacityMin: editForm.seatCapacityMin ? Number(editForm.seatCapacityMin) : null,
        maxTravelMins: editForm.maxTravelMins ? Number(editForm.maxTravelMins) : null,
        clusterRadiusKm: editForm.clusterRadiusKm ? Number(editForm.clusterRadiusKm) : 1.5,
        // Reset geocoded coords if office address changed
        officeLat: null, officeLng: null,
      }),
    });
    setSaving(false);
    if (!res.ok) { setError("Save failed. Please try again."); return; }
    setEditingId(null);
    load();
  }

  async function deleteRequest(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/corporate/requests/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Delete failed");
      return;
    }
    setRequests(prev => prev.filter(r => r.id !== id));
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <span className="text-xl font-black text-violet-700">HappyBusRide</span>
            <span className="ml-2 text-sm text-gray-500">Corporate</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{companyName}</span>
            <Link href="/corporate/new-request"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
              + New Request
            </Link>
            <button onClick={() => signOut({ callbackUrl: "/corporate/login" })}
              className="text-xs text-gray-400 hover:text-red-500">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          {[
            { label: "Total Requests", value: requests.length, color: "text-violet-700" },
            { label: "Active Commutes", value: active,  color: "text-green-600" },
            { label: "Pending Quotes",  value: pending, color: "text-yellow-600" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
              <div className="mt-1 text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Requests table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="font-bold text-gray-900">Your Charter Requests</h2>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500">Sort:
                <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
                  className="ml-1 rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-700">
                  <option value="createdAt">Recent first</option>
                  <option value="startDate">Start date</option>
                  <option value="status">Status</option>
                </select>
              </label>
              <Link href="/corporate/new-request" className="text-sm font-medium text-violet-600">+ New</Link>
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mb-3 text-4xl">🏢</div>
              <h3 className="font-semibold text-gray-900">No requests yet</h3>
              <Link href="/corporate/new-request"
                className="mt-4 inline-block rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                Create Request
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                    <th className="px-5 py-3">City</th>
                    <th className="px-5 py-3">Office / Timing</th>
                    <th className="px-5 py-3">Start Date</th>
                    <th className="px-5 py-3">Employees</th>
                    <th className="px-5 py-3">Quotes</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">{r.city}, {r.state}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs max-w-[180px]">
                        <div className="truncate">{r.officeAddress}</div>
                        <div className="text-gray-400">{r.arrivalTime} – {r.departureTime}</div>
                      </td>
                      <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                        {format(new Date(r.startDate), "d MMM yyyy")}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{r._count.employees}</td>
                      <td className="px-5 py-3 text-gray-600">{r._count.bids}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>
                          {r.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {format(new Date(r.createdAt), "d MMM yy")}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <Link href={`/corporate/request/${r.id}`}
                            className="text-violet-600 hover:underline text-xs">View</Link>
                          <button onClick={() => startEdit(r)}
                            className="text-gray-500 hover:text-gray-800 text-xs">Edit</button>
                          {!["ACTIVE","ACCEPTED"].includes(r.status) && (
                            <button
                              onClick={() => { if (confirm("Delete this request? This cannot be undone.")) deleteRequest(r.id); }}
                              disabled={deletingId === r.id}
                              className="text-red-400 hover:text-red-600 text-xs disabled:opacity-50">
                              {deletingId === r.id ? "…" : "Delete"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── Edit modal ── */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="font-bold text-gray-900">Edit Request</h3>
              <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-4">
              {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">City *</label>
                  <input className={inputCls} value={editForm.city ?? ""} onChange={e => upd("city", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">State *</label>
                  <input className={inputCls} value={editForm.state ?? ""} onChange={e => upd("state", e.target.value)} />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Office Address *</label>
                <input className={inputCls} value={editForm.officeAddress ?? ""} onChange={e => upd("officeAddress", e.target.value)} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Arrival Time</label>
                  <input type="time" className={inputCls} value={editForm.arrivalTime ?? ""} onChange={e => upd("arrivalTime", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Departure Time</label>
                  <input type="time" className={inputCls} value={editForm.departureTime ?? ""} onChange={e => upd("departureTime", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Max Travel (min)</label>
                  <input type="number" className={inputCls} value={editForm.maxTravelMins ?? ""} onChange={e => upd("maxTravelMins", e.target.value)} placeholder="60" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-600">Pickup Stop Cluster Radius</label>
                  <span className="text-sm font-bold text-violet-700">{editForm.clusterRadiusKm ?? 1.5} km</span>
                </div>
                <input
                  type="range" min="0.5" max="5" step="0.5"
                  value={Number(editForm.clusterRadiusKm ?? 1.5)}
                  onChange={e => upd("clusterRadiusKm", parseFloat(e.target.value))}
                  className="w-full accent-violet-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0.5 km (dense)</span>
                  <span>2.5 km</span>
                  <span>5 km (suburban)</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Employees within this radius share one pickup stop. Affects how many stops are created per bus route.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Start Date</label>
                  <input type="date" className={inputCls} value={editForm.startDate?.slice(0,10) ?? ""} onChange={e => upd("startDate", e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Bus Type</label>
                  <select className={inputCls} value={editForm.busType ?? ""} onChange={e => upd("busType", e.target.value)}>
                    {BUS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Min Seat Capacity</label>
                  <select className={inputCls} value={String(editForm.seatCapacityMin ?? "")} onChange={e => upd("seatCapacityMin", e.target.value)}>
                    {CAPACITY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="flex items-end gap-6 pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!editForm.hasAc} onChange={e => upd("hasAc", e.target.checked)} className="h-4 w-4 rounded text-violet-600" />
                    <span className="text-sm text-gray-700">AC Required</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!editForm.hasWifi} onChange={e => upd("hasWifi", e.target.checked)} className="h-4 w-4 rounded text-violet-600" />
                    <span className="text-sm text-gray-700">WiFi Required</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Notes</label>
                <textarea rows={2} className={inputCls} value={editForm.notes ?? ""} onChange={e => upd("notes", e.target.value)} placeholder="Any special requirements…" />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button onClick={() => setEditingId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={saving}
                className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
