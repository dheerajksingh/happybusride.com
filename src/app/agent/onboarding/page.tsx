"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AgentOnboardingPage() {
  const router = useRouter();
  const [agent, setAgent] = useState<any>(null);
  const [form, setForm] = useState({ panNumber: "", aadhaarNumber: "", whatsappNumber: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/agent/profile").then(r => r.json()).then(d => {
      setAgent(d.agent);
      setForm({
        panNumber: d.agent.panNumber ?? "",
        aadhaarNumber: d.agent.aadhaarNumber ?? "",
        whatsappNumber: d.agent.whatsappNumber ?? "",
        address: d.agent.address ?? "",
      });
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/agent/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none";
  const labelCls = "mb-1 block text-sm font-medium text-gray-700";

  if (!agent) return <div className="py-12 text-center text-gray-400">Loading…</div>;

  return (
    <div className="max-w-xl">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">My Profile</h1>
      <p className="mb-6 text-sm text-gray-500">Complete your KYC details for admin approval.</p>

      <div className="mb-4 rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm space-y-1">
        <div><span className="text-gray-400">Name:</span> <span className="font-medium">{agent.fullName}</span></div>
        <div><span className="text-gray-400">Email:</span> <span className="font-medium">{agent.user?.email}</span></div>
        <div><span className="text-gray-400">City:</span> <span className="font-medium">{agent.city?.name}, {agent.city?.state}</span></div>
        <div><span className="text-gray-400">Status:</span>{" "}
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            agent.status === "APPROVED" ? "bg-green-100 text-green-700"
            : agent.status === "PENDING" ? "bg-yellow-100 text-yellow-700"
            : "bg-red-100 text-red-600"
          }`}>{agent.status}</span>
        </div>
      </div>

      <form onSubmit={save} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-900">KYC Documents</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>PAN Number</label>
            <input className={inputCls} value={form.panNumber} onChange={e => setForm(f => ({ ...f, panNumber: e.target.value }))} placeholder="ABCDE1234F" />
          </div>
          <div>
            <label className={labelCls}>Aadhaar Number</label>
            <input className={inputCls} value={form.aadhaarNumber} onChange={e => setForm(f => ({ ...f, aadhaarNumber: e.target.value }))} placeholder="1234 5678 9012" />
          </div>
        </div>
        <div>
          <label className={labelCls}>WhatsApp Number</label>
          <input className={inputCls} value={form.whatsappNumber} onChange={e => setForm(f => ({ ...f, whatsappNumber: e.target.value }))} placeholder="+91 98765 43210" />
        </div>
        <div>
          <label className={labelCls}>Business Address</label>
          <textarea rows={2} className={inputCls} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
        </div>
        <button type="submit" disabled={saving}
          className="w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
          {saving ? "Saving…" : saved ? "✅ Saved!" : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
