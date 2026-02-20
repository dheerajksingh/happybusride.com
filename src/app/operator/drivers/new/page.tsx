"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function NewDriverPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    licenseNumber: "",
    licenseExpiry: "",
    password: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/operator/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) router.push("/operator/drivers");
    else {
      const err = await res.json();
      alert(err.error ?? "Failed to add driver");
    }
  }

  return (
    <div className="max-w-md">
      <div className="mb-4">
        <Link href="/operator/drivers" className="text-sm text-blue-600 hover:underline">← Drivers</Link>
      </div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Add Driver</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <Input
          label="Full Name *"
          placeholder="Driver's full name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
        <Input
          label="Email"
          type="email"
          placeholder="driver@example.com"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <Input
          label="Phone"
          type="tel"
          placeholder="10-digit mobile number"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
        <Input
          label="License Number *"
          placeholder="e.g. DL1420110012345"
          value={form.licenseNumber}
          onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))}
          required
        />
        <Input
          label="License Expiry *"
          type="date"
          value={form.licenseExpiry}
          onChange={(e) => setForm((f) => ({ ...f, licenseExpiry: e.target.value }))}
          required
        />
        <Input
          label="Login Password *"
          type="password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required
        />
        <p className="text-xs text-gray-400">
          The driver will use their email and this password to log in to the driver app.
        </p>
        <Button type="submit" variant="primary" loading={loading} className="w-full">
          Add Driver
        </Button>
      </form>
    </div>
  );
}
