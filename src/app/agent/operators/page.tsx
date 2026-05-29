"use client";
import { useEffect, useState } from "react";

export default function AgentOperatorsPage() {
  const [operators, setOperators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agent/operators").then(r => r.json()).then(d => { setOperators(d.operators ?? []); setLoading(false); });
  }, []);

  if (loading) return <div className="py-12 text-center text-gray-400">Loading…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Operators</h1>
        <p className="text-sm text-gray-500">Operators you are linked with and their buses</p>
      </div>

      {operators.length === 0 ? (
        <div className="rounded-xl bg-white border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">🚌</div>
          <h3 className="font-semibold text-gray-900">No operators linked</h3>
          <p className="text-sm text-gray-500 mt-1">Contact operators and ask them to link you via their portal.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {operators.map((op: any) => (
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
      )}
    </div>
  );
}
