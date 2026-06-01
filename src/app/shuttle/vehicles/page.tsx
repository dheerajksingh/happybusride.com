"use client";

import { useEffect, useState } from "react";

export default function ShuttleVehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ vehicleType: "SEATER_8", regNo: "", name: "" });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/shuttle/vehicles").then(r => r.json()).then(d => {
      setVehicles(d.vehicles ?? []);
      setLoading(false);
    });
  }, []);

  async function addVehicle(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setAdding(true);
    const res = await fetch("/api/shuttle/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    setAdding(false);
    if (!res.ok) { setError(d.error ?? "Failed to add vehicle"); return; }
    setVehicles(prev => [d.vehicle, ...prev]);
    setForm({ vehicleType: "SEATER_8", regNo: "", name: "" });
  }

  const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Vehicles</h1>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-900">Add Vehicle</h2>
        <form onSubmit={addVehicle} className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Vehicle Type</label>
            <select className={inputCls} value={form.vehicleType} onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))}>
              <option value="SEATER_6">6-Seater</option>
              <option value="SEATER_8">8-Seater</option>
              <option value="SEATER_10">10-Seater</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Registration No</label>
            <input required className={inputCls} value={form.regNo} onChange={e => setForm(f => ({ ...f, regNo: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Vehicle Name</label>
            <input required className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          {error && <div className="col-span-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}
          <div className="col-span-3">
            <button type="submit" disabled={adding}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
              {adding ? "Adding…" : "Add Vehicle"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : vehicles.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No vehicles added yet.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Reg No</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {vehicles.map((v: any) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{v.name}</td>
                  <td className="px-5 py-3 text-gray-600">{v.vehicleType.replace("SEATER_", "")} Seater</td>
                  <td className="px-5 py-3 text-gray-600">{v.regNo}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${v.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {v.isActive ? "Active" : "Inactive"}
                    </span>
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
