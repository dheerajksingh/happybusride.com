"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const VEHICLE_TYPES = ["Sedan", "SUV", "Hatchback", "Auto"];

export default function CabRegisterPage() {
  const router = useRouter();
  const [cities, setCities] = useState<any[]>([]);
  const [form, setForm] = useState({
    fullName: "", address: "", cityId: "", phone: "", whatsapp: "",
    email: "", password: "", vehicleReg: "", vehicleType: "", driverName: "", driverPhone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/cities").then(r => r.json()).then(d => setCities(d.cities ?? []));
  }, []);

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/cab/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    setLoading(false);
    if (!res.ok) { setError(d.error ?? "Registration failed"); return; }
    router.push("/cab/login?registered=1");
  }

  const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none";
  const labelCls = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-yellow-100 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-black text-orange-600">HappyBusRide</Link>
          <div className="mt-1 text-lg font-bold text-gray-900">Cab Operator Registration</div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Full Name</label>
              <input required className={inputCls} value={form.fullName} onChange={e => update("fullName", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Address</label>
              <input required className={inputCls} value={form.address} onChange={e => update("address", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <select required className={inputCls} value={form.cityId} onChange={e => update("cityId", e.target.value)}>
                <option value="">Select city</option>
                {cities.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}, {c.state}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input required className={inputCls} value={form.phone} onChange={e => update("phone", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>WhatsApp</label>
              <input className={inputCls} value={form.whatsapp} onChange={e => update("whatsapp", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" required className={inputCls} value={form.email} onChange={e => update("email", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input type="password" required className={inputCls} value={form.password} onChange={e => update("password", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Vehicle Type</label>
              <select required className={inputCls} value={form.vehicleType} onChange={e => update("vehicleType", e.target.value)}>
                <option value="">Select type</option>
                {VEHICLE_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Vehicle Registration No</label>
              <input className={inputCls} value={form.vehicleReg} onChange={e => update("vehicleReg", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Driver Name</label>
              <input className={inputCls} value={form.driverName} onChange={e => update("driverName", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Driver Phone</label>
              <input className={inputCls} value={form.driverPhone} onChange={e => update("driverPhone", e.target.value)} />
            </div>
          </div>

          {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
            {loading ? "Registering…" : "Register"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          Already registered? <Link href="/cab/login" className="font-semibold text-orange-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
