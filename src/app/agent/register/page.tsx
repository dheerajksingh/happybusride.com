"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface City { id: string; name: string; state: string; }

export default function AgentRegisterPage() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [cityQuery, setCityQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", whatsappNumber: "",
    address: "", cityId: "", password: "", confirmPassword: "",
  });

  useEffect(() => {
    if (cityQuery.length < 1) { setCities([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/cities?q=${encodeURIComponent(cityQuery)}`);
      if (res.ok) setCities(await res.json());
    }, 200);
    return () => clearTimeout(t);
  }, [cityQuery]);

  function upd(f: string, v: string) { setForm(p => ({ ...p, [f]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (!form.cityId) { setError("Please select a city from the dropdown."); return; }
    setError(""); setLoading(true);
    const res = await fetch("/api/agent/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, whatsappNumber: form.whatsappNumber || undefined }),
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
          <div className="relative">
            <label className={labelCls}>Operating City *</label>
            <input className={inputCls} value={cityQuery}
              onChange={e => { setCityQuery(e.target.value); upd("cityId", ""); }}
              placeholder="Search city…" />
            {cities.length > 0 && !form.cityId && (
              <ul className="absolute z-50 mt-1 max-h-44 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {cities.map(c => (
                  <li key={c.id} onClick={() => { upd("cityId", c.id); setCityQuery(`${c.name}, ${c.state}`); setCities([]); }}
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-orange-50">
                    {c.name} <span className="text-gray-400">— {c.state}</span>
                  </li>
                ))}
              </ul>
            )}
            {form.cityId && <p className="mt-1 text-xs text-green-600">✅ City selected</p>}
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
