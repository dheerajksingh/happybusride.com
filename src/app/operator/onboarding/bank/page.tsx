"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function BankDetailsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bankName: "",
    bankAccountName: "",
    bankAccountNo: "",
    bankIfsc: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/operator", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) router.push("/operator");
    else alert("Failed to save bank details");
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bank Details</h1>
        <p className="text-gray-500">Step 3 of 3 — Where should we send your earnings?</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <Input
          label="Bank Name *"
          placeholder="e.g. HDFC Bank"
          value={form.bankName}
          onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
          required
        />
        <Input
          label="Account Holder Name *"
          placeholder="Name as on bank account"
          value={form.bankAccountName}
          onChange={(e) => setForm((f) => ({ ...f, bankAccountName: e.target.value }))}
          required
        />
        <Input
          label="Account Number *"
          placeholder="Bank account number"
          value={form.bankAccountNo}
          onChange={(e) => setForm((f) => ({ ...f, bankAccountNo: e.target.value }))}
          required
        />
        <Input
          label="IFSC Code *"
          placeholder="e.g. HDFC0001234"
          value={form.bankIfsc}
          onChange={(e) => setForm((f) => ({ ...f, bankIfsc: e.target.value.toUpperCase() }))}
          required
        />

        <div className="rounded-lg bg-yellow-50 p-3 text-xs text-yellow-700">
          ⚠️ Your bank details are encrypted and used only for payouts. We do not share this information.
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={() => router.push("/operator/onboarding/kyc")} className="flex-1">
            ← Back
          </Button>
          <Button type="submit" variant="primary" loading={loading} className="flex-1">
            Complete Setup →
          </Button>
        </div>
      </form>
    </div>
  );
}
