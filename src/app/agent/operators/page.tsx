"use client";
import { useEffect, useState } from "react";

export default function AgentOperatorsPage() {
  const [linkedOps, setLinkedOps] = useState<any[]>([]);
  const [cityBuses, setCityBuses] = useState<{ agentCity: string; operators: any[] }>({ agentCity: "", operators: [] });
  const [tab, setTab] = useState<"linked" | "city">("city");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/agent/operators").then(r => r.json()),
      fetch("/api/agent/city-buses").then(r => r.json()),
    ]).then(([ops, cb]) => {
      setLinkedOps(ops.operators ?? []);
      setCityBuses(cb);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="py-12 text-center text-gray-400">Loading…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Operators & Buses</h1>
        <p className="text-sm text-gray-500">
          Operators whose buses stop in your city and operators you are linked with
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        <button onClick={() => setTab("city")}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${tab === "city" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
          Buses in {cityBuses.agentCity || "My City"} ({cityBuses.operators.length})
        </button>
        <button onClick={() => setTab("linked")}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${tab === "linked" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
          My Operators ({linkedOps.length})
        </button>
      </div>

      {tab === "city" && (
        cityBuses.operators.length === 0 ? (
          <div className="rounded-xl bg-white border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-3">🚌</div>
            <h3 className="font-semibold text-gray-900">No buses stopping here</h3>
            <p className="text-sm text-gray-500 mt-1">No active routes currently pass through your city.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cityBuses.operators.map((op: any) => (
              <div key={op.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 text-lg">{op.companyName}</div>
                    {op.user?.email && <div className="text-xs text-gray-500">{op.user.email}</div>}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${op.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {op.status}
                  </span>
                </div>
                {op.buses?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Buses stopping at your city</p>
                    <div className="grid grid-cols-2 gap-2">
                      {op.buses.map((b: any) => (
                        <div key={b.id} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm">
                          <div className="font-medium text-gray-800">{b.name}</div>
                          <div className="text-xs text-gray-400">{b.registrationNo} · {b.busType.replace(/_/g, " ")}</div>
                          <div className="text-xs text-blue-600 mt-0.5">Stop: {b.stopName}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {tab === "linked" && (
        linkedOps.length === 0 ? (
          <div className="rounded-xl bg-white border border-gray-200 p-12 text-center">
            <div className="text-4xl mb-3">🤝</div>
            <h3 className="font-semibold text-gray-900">No operators linked</h3>
            <p className="text-sm text-gray-500 mt-1">Contact operators and ask them to link you via their portal.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {linkedOps.map((op: any) => (
              <div key={op.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-bold text-gray-900 text-lg">{op.companyName}</div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${op.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {op.status}
                  </span>
                </div>
                {op.buses?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Buses</p>
                    <div className="grid grid-cols-2 gap-2">
                      {op.buses.map((b: any) => (
                        <div key={b.id} className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm">
                          <div className="font-medium text-gray-800">{b.name}</div>
                          <div className="text-xs text-gray-400">{b.registrationNo} · {b.busType.replace(/_/g, " ")}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
