"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  companyName: string;
  registrationNo: string;
  gstNumber: string;
  panNumber: string;
  bankName: string;
  bankAccountNo: string;
  bankIfsc: string;
  bankAccountName: string;
  commissionRate: string;
  cancellationPolicy: string;
}

const empty: FormData = {
  name: "", email: "", phone: "", password: "",
  companyName: "", registrationNo: "", gstNumber: "", panNumber: "",
  bankName: "", bankAccountNo: "", bankIfsc: "", bankAccountName: "",
  commissionRate: "10", cancellationPolicy: "MODERATE",
};

function Field({ label, name, value, onChange, type = "text", placeholder = "", required = false }:
  { label: string; name: keyof FormData; value: string; onChange: (k: keyof FormData, v: string) => void;
    type?: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
}

export default function NewOperatorPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(empty);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/operators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, commissionRate: Number(form.commissionRate) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create operator"); return; }
      router.push("/admin/operators");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold text-white">Add Operator</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account */}
        <section className="rounded-xl bg-gray-800 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Account</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name" name="name" value={form.name} onChange={update} required placeholder="John Doe" />
            <Field label="Email" name="email" value={form.email} onChange={update} type="email" required placeholder="operator@company.com" />
            <Field label="Phone" name="phone" value={form.phone} onChange={update} required placeholder="9876543210" />
            <Field label="Temporary Password" name="password" value={form.password} onChange={update} type="password" required placeholder="Min 8 characters" />
          </div>
        </section>

        {/* Company */}
        <section className="rounded-xl bg-gray-800 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Company &amp; Licenses</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Company Name" name="companyName" value={form.companyName} onChange={update} required placeholder="ABC Travels Pvt. Ltd." />
            </div>
            <Field label="Registration No." name="registrationNo" value={form.registrationNo} onChange={update} placeholder="CIN / MCA number" />
            <Field label="GST Number" name="gstNumber" value={form.gstNumber} onChange={update} placeholder="22AAAAA0000A1Z5" />
            <Field label="PAN Number" name="panNumber" value={form.panNumber} onChange={update} placeholder="AAAAA0000A" />
          </div>
        </section>

        {/* Bank Details */}
        <section className="rounded-xl bg-gray-800 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Bank Details (for commission payments)</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Bank Name" name="bankName" value={form.bankName} onChange={update} placeholder="State Bank of India" />
            <Field label="Account Holder Name" name="bankAccountName" value={form.bankAccountName} onChange={update} placeholder="ABC Travels Pvt. Ltd." />
            <Field label="Account Number" name="bankAccountNo" value={form.bankAccountNo} onChange={update} placeholder="1234567890" />
            <Field label="IFSC Code" name="bankIfsc" value={form.bankIfsc} onChange={update} placeholder="SBIN0001234" />
          </div>
        </section>

        {/* Settings */}
        <section className="rounded-xl bg-gray-800 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">Settings</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Commission Rate (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.commissionRate}
                onChange={(e) => update("commissionRate", e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">Cancellation Policy</label>
              <select
                value={form.cancellationPolicy}
                onChange={(e) => update("cancellationPolicy", e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="FLEXIBLE">Flexible</option>
                <option value="MODERATE">Moderate</option>
                <option value="STRICT">Strict</option>
              </select>
            </div>
          </div>
        </section>

        {error && (
          <p className="rounded-lg bg-red-900/40 px-4 py-3 text-sm text-red-400">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-600 px-5 py-2.5 text-sm text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Operator"}
          </button>
        </div>
      </form>
    </div>
  );
}
