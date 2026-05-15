"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CorporateRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    companyName: "",
    companyAddress: "",
    city: "",
    state: "",
    gstNumber: "",
    companyPhone: "",
    companyEmail: "",
    contactName: "",
    position: "",
    password: "",
    confirmPassword: "",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);

    const res = await fetch("/api/corporate/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Registration failed.");
      return;
    }

    router.push("/corporate/login?registered=1");
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50 to-purple-100 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <a href="/" className="mb-1 block text-2xl font-black text-violet-700 hover:opacity-80">HappyBusRide</a>
          <div className="text-lg font-bold text-gray-900">Corporate Registration</div>
        </div>

        {/* Stepper */}
        <div className="mb-8 flex items-center gap-0">
          {[1, 2].map((s, i) => (
            <div key={s} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    step >= s ? "bg-violet-600 text-white" : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {s}
                </div>
                <span className={`text-xs ${step >= s ? "text-violet-600 font-semibold" : "text-gray-400"}`}>
                  {s === 1 ? "Company" : "Contact"}
                </span>
              </div>
              {i < 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-4 ${step > 1 ? "bg-violet-600" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleSubmit}>
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Company Name *</label>
                <input className={inputClass} required value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Acme Corp Pvt Ltd" />
              </div>
              <div>
                <label className={labelClass}>Company Address *</label>
                <input className={inputClass} required value={form.companyAddress} onChange={(e) => update("companyAddress", e.target.value)} placeholder="123, MG Road, …" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>City *</label>
                  <input className={inputClass} required value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Bengaluru" />
                </div>
                <div>
                  <label className={labelClass}>State *</label>
                  <input className={inputClass} required value={form.state} onChange={(e) => update("state", e.target.value)} placeholder="Karnataka" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>GST Number</label>
                  <input className={inputClass} value={form.gstNumber} onChange={(e) => update("gstNumber", e.target.value)} placeholder="29AABCU9603R1ZX" />
                </div>
                <div>
                  <label className={labelClass}>Company Phone *</label>
                  <input className={inputClass} required value={form.companyPhone} onChange={(e) => update("companyPhone", e.target.value)} placeholder="+91 98765 43210" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Company Email *</label>
                <input type="email" className={inputClass} required value={form.companyEmail} onChange={(e) => update("companyEmail", e.target.value)} placeholder="admin@acmecorp.in" />
              </div>
              <button type="submit" className="w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700">
                Next →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Your Name *</label>
                  <input className={inputClass} required value={form.contactName} onChange={(e) => update("contactName", e.target.value)} placeholder="Raj Sharma" />
                </div>
                <div>
                  <label className={labelClass}>Position</label>
                  <input className={inputClass} value={form.position} onChange={(e) => update("position", e.target.value)} placeholder="Fleet Manager" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Password *</label>
                <input type="password" className={inputClass} required minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Min 8 characters" />
              </div>
              <div>
                <label className={labelClass}>Confirm Password *</label>
                <input type="password" className={inputClass} required value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Re-enter password" />
              </div>

              {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  ← Back
                </button>
                <button type="submit" disabled={loading} className="flex-1 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
                  {loading ? "Creating account…" : "Create Account"}
                </button>
              </div>
            </div>
          )}
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          Already registered?{" "}
          <Link href="/corporate/login" className="font-semibold text-violet-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
