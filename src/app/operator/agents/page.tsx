"use client";

import { useEffect, useState } from "react";
import { PageSpinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";

export default function OperatorAgentsPage() {
  const [myAgents, setMyAgents] = useState<any[]>([]);
  const [routeAgents, setRouteAgents] = useState<any[]>([]);
  const [routeCities, setRouteCities] = useState<any[]>([]);
  const [tab, setTab] = useState<"mine" | "route">("mine");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/operator/agents").then(r => r.json()),
      fetch("/api/operator/agents/route-cities").then(r => r.json()),
    ]).then(([my, rc]) => {
      setMyAgents(my.agents ?? []);
      setRouteAgents(rc.agents ?? []);
      setRouteCities(rc.cities ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
        <p className="text-sm text-gray-500">Agents linked to your operation and agents in your route cities</p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        <button onClick={() => setTab("mine")}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${tab === "mine" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
          My Agents ({myAgents.length})
        </button>
        <button onClick={() => setTab("route")}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${tab === "route" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
          Route City Agents ({routeAgents.length})
        </button>
      </div>

      {tab === "mine" && (
        myAgents.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <p className="mb-2 text-4xl">🤝</p>
            <h3 className="font-semibold text-gray-900">No agents associated yet</h3>
            <p className="mt-2 text-sm text-gray-500">No agents are linked to your operation yet.</p>
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
                {myAgents.map((a: any) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">{a.cityName}</td>
                    <td className="px-4 py-3 text-gray-600">{a.phone}</td>
                    <td className="px-4 py-3 text-gray-600">{a.email ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{a.passengerBookings}</td>
                    <td className="px-4 py-3 text-gray-600">{a.freightBookings}</td>
                    <td className="px-4 py-3">
                      <Badge variant={a.status === "APPROVED" ? "success" : a.status === "PENDING" ? "warning" : "danger"}>
                        {a.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === "route" && (
        routeAgents.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <p className="mb-2 text-4xl">📍</p>
            <h3 className="font-semibold text-gray-900">No agents at route stops</h3>
            <p className="mt-2 text-sm text-gray-500">No approved agents found in your route cities. Agents register separately and are linked to cities.</p>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              {routeCities.map((c: any) => (
                <span key={c.id} className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">{c.name}</span>
              ))}
            </div>
            <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                    <th className="px-4 py-3">Agent Name</th>
                    <th className="px-4 py-3">City (Route Stop)</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">WhatsApp</th>
                    <th className="px-4 py-3">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {routeAgents.map((a: any) => (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{a.fullName}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{a.cityName}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.phone}</td>
                      <td className="px-4 py-3 text-gray-600">{a.whatsappNumber ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{a.email ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
