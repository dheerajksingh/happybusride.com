"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type DocField = {
  key: "panDocUrl" | "gstDocUrl" | "rcDocUrl" | "bankProofUrl";
  label: string;
};

const DOC_FIELDS: DocField[] = [
  { key: "panDocUrl", label: "PAN Document" },
  { key: "gstDocUrl", label: "GST Certificate" },
  { key: "rcDocUrl", label: "RC Document (Vehicle Registration)" },
  { key: "bankProofUrl", label: "Bank Proof (Cancelled Cheque / Passbook)" },
];

export default function KycPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState<Record<string, string>>({});

  async function uploadFile(field: string, file: File) {
    setUploading(field);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("subfolder", "kyc");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(null);
    if (res.ok) {
      const { url } = await res.json();
      setDocs((d) => ({ ...d, [field]: url }));
    } else {
      alert("Upload failed. Try again.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/operator", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...docs,
        // Update KYC status
        status: "KYC_SUBMITTED",
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/operator/onboarding/bank");
    else alert("Failed to save KYC");
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">KYC Documents</h1>
        <p className="text-gray-500">Step 2 of 3 — Upload required documents</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        {DOC_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
            {docs[key] ? (
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                <span className="text-green-600 text-sm">✓ Uploaded</span>
                <a href={docs[key]} target="_blank" className="text-xs text-blue-600 hover:underline">View</a>
                <button
                  type="button"
                  onClick={() => setDocs((d) => { const n = { ...d }; delete n[key]; return n; })}
                  className="ml-auto text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors ${
                uploading === key ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"
              }`}>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadFile(key, e.target.files[0])}
                  disabled={!!uploading}
                />
                <span className="text-2xl">📄</span>
                <span className="text-sm text-gray-500">
                  {uploading === key ? "Uploading..." : "Click to upload (PDF or image, max 5MB)"}
                </span>
              </label>
            )}
          </div>
        ))}

        <p className="text-xs text-gray-400">
          You can skip documents for now and upload them later. Admin review will require all documents.
        </p>

        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={() => router.push("/operator/onboarding")} className="flex-1">
            ← Back
          </Button>
          <Button type="submit" variant="primary" loading={saving} className="flex-1">
            Save & Continue →
          </Button>
        </div>
      </form>
    </div>
  );
}
