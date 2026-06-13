"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CityAutocomplete } from "@/components/ui/CityAutocomplete";
import type { City } from "@/components/ui/CityAutocomplete";

export default function AgentRegisterPage() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", whatsappNumber: "",
    address: "", password: "", confirmPassword: "",
  });

  function upd(f: string, v: string) { setForm(p => ({ ...p, [f]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (!selectedCity) { setError("Please select a city."); return; }
    setError(""); setLoading(true);
    const res = await fetch("/api/agent/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, cityId: selectedCity.id, whatsappNumber: form.whatsappNumber || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Registration failed."); return; }
    router.push("/agent/login?registered=1");
  }

  const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none";
  const labelCls = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-amber-100 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-black text-orange-600 hover:opacity-80">HappyBusRide</Link>
          <div className="mt-1 text-lg font-bold text-gray-900">Agent Registration</div>
          <p className="text-sm text-gray-500">Your account will be reviewed before activation</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Full Name *</label>
            <input className={inputCls} required value={form.fullName} onChange={e => upd("fullName", e.target.value)} placeholder="Your full name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email *</label>
              <input type="email" className={inputCls} required value={form.email} onChange={e => upd("email", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Phone *</label>
              <input className={inputCls} required value={form.phone} onChange={e => upd("phone", e.target.value)} placeholder="+91 98765 43210" />
            </div>
          </div>
          <div>
            <label className={labelCls}>WhatsApp Number</label>
            <input className={inputCls} value={form.whatsappNumber} onChange={e => upd("whatsappNumber", e.target.value)} placeholder="If different from phone" />
          </div>
          <div>
            <label className={labelCls}>Address *</label>
            <input className={inputCls} required value={form.address} onChange={e => upd("address", e.target.value)} placeholder="Your business address" />
          </div>
          <div>
            <CityAutocomplete
              label="Operating City *"
              value={selectedCity ? `${selectedCity.name}, ${selectedCity.state}` : ""}
              onChange={setSelectedCity}
              placeholder="Search city…"
            />
            {selectedCity && <p className="mt-1 text-xs text-green-600">✅ {selectedCity.name} selected</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Password *</label>
              <input type="password" className={inputCls} required minLength={8} value={form.password} onChange={e => upd("password", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Confirm Password *</label>
              <input type="password" className={inputCls} required value={form.confirmPassword} onChange={e => upd("confirmPassword", e.target.value)} />
            </div>
          </div>
          {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
            {loading ? "Creating account…" : "Create Agent Account"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-gray-500">
          Already registered? <Link href="/agent/login" className="font-semibold text-orange-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
