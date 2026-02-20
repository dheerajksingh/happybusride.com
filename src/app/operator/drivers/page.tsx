"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/operator/drivers")
      .then((r) => r.json())
      .then((d) => { setDrivers(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Drivers ({drivers.length})</h1>
        <Link
          href="/operator/drivers/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Add Driver
        </Link>
      </div>

      {drivers.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="mb-2 text-4xl">👨‍✈️</p>
          <h3 className="font-semibold text-gray-900">No drivers yet</h3>
          <Link href="/operator/drivers/new" className="mt-4 inline-block text-sm font-medium text-blue-600">
            Add Driver →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">License</th>
                <th className="px-4 py-3">Expiry</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d: any) => (
                <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{d.user?.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <p>{d.user?.email ?? "—"}</p>
                    <p className="text-xs">{d.user?.phone ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{d.licenseNumber}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.licenseExpiry ? new Date(d.licenseExpiry).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={d.user?.isActive ? "success" : "danger"}>
                      {d.user?.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
