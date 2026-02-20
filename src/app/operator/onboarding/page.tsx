"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function OperatorOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    gstNumber: "",
    panNumber: "",
    registrationNo: "",
  });

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName) { alert("Company name is required"); return; }
    setLoading(true);

    const res = await fetch("/api/operator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    if (res.ok) {
      router.push("/operator/onboarding/kyc");
    } else {
      const data = await res.json();
      alert(data.error ?? "Failed to save");
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Operator Onboarding</h1>
        <p className="text-gray-500">Step 1 of 3 — Company Information</p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Company / Operator Name *" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="e.g., Sharma Travels Pvt. Ltd." />
          <Input label="Company Registration No." value={form.registrationNo} onChange={(e) => update("registrationNo", e.target.value)} placeholder="e.g., MH-XXXXX-2024" />
          <Input label="GST Number" value={form.gstNumber} onChange={(e) => update("gstNumber", e.target.value)} placeholder="27AABCU9603R1ZP" />
          <Input label="PAN Number" value={form.panNumber} onChange={(e) => update("panNumber", e.target.value)} placeholder="AABCU9603R" />
          <Button type="submit" loading={loading} className="w-full">Save & Continue</Button>
        </form>
      </div>
    </div>
  );
}
