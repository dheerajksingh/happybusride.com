"use client";

import { useEffect, useState } from "react";
import { PageSpinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";

export default function OperatorAgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/operator/agents")
      .then((r) => r.json())
      .then((d) => { setAgents(d.agents ?? []); setLoading(false); });
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agents ({agents.length})</h1>
        <p className="text-sm text-gray-500">Agents linked to your operation</p>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="mb-2 text-4xl">🤝</p>
          <h3 className="font-semibold text-gray-900">No agents associated yet</h3>
          <p className="mt-2 text-sm text-gray-500">No agents are associated with your operation yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-3">Agent Name</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Passenger Bookings</th>
                <th className="px-4 py-3">Freight Bookings</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a: any) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{a.cityName}</td>
                  <td className="px-4 py-3 text-gray-600">{a.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{a.email ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{a.passengerBookings}</td>
                  <td className="px-4 py-3 text-gray-600">{a.freightBookings}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        a.status === "APPROVED" ? "success"
                        : a.status === "PENDING" ? "warning"
                        : "danger"
                      }
                    >
                      {a.status}
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
