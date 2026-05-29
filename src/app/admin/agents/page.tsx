"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";

const STATUS_STYLE: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-700",
  APPROVED:  "bg-green-100 text-green-700",
  REJECTED:  "bg-red-100 text-red-600",
  SUSPENDED: "bg-gray-100 text-gray-500",
};

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/agents");
    if (res.ok) setAgents((await res.json()).agents);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function action(agentId: string, endpoint: string, body?: object) {
    setActing(agentId);
    await fetch(`/api/admin/agents/${agentId}/${endpoint}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    await load();
    setActing(null);
  }

  if (loading) return <div className="py-12 text-center text-gray-400">Loading…</div>;

  const pending  = agents.filter(a => a.status === "PENDING");
  const rest     = agents.filter(a => a.status !== "PENDING");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Agents</h1>
        <p className="text-sm text-gray-400">{pending.length} pending approval · {agents.length} total</p>
      </div>

      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-400">Pending Approval</h2>
          <div className="space-y-3">
            {pending.map(a => (
              <div key={a.id} className="rounded-xl bg-gray-800 border border-amber-800/40 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-white">{a.fullName}</div>
                    <div className="text-sm text-gray-400">{a.user?.email} · {a.city?.name}, {a.city?.state}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Linked operators: {a.operators?.map((o: any) => o.operator?.companyName).join(", ") || "None yet"} ·
                      Applied {format(new Date(a.user?.createdAt), "d MMM yyyy")}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => action(a.id, "approve")} disabled={acting === a.id}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                      Approve
                    </button>
                    <button onClick={() => { const r = prompt("Reason for rejection:"); if (r) action(a.id, "reject", { reason: r }); }}
                      disabled={acting === a.id}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-gray-800 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left text-xs uppercase text-gray-400">
              <th className="px-5 py-3">Agent</th>
              <th className="px-5 py-3">City</th>
              <th className="px-5 py-3">Operators</th>
              <th className="px-5 py-3">Seat Bkgs</th>
              <th className="px-5 py-3">Freight</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rest.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-gray-500">No agents yet.</td></tr>
            )}
            {rest.map(a => (
              <tr key={a.id} className="border-b border-gray-700 hover:bg-gray-750">
                <td className="px-5 py-3">
                  <div className="font-medium text-white">{a.fullName}</div>
                  <div className="text-xs text-gray-400">{a.user?.email}</div>
                </td>
                <td className="px-5 py-3 text-gray-300">{a.city?.name}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">{a.operators?.map((o: any) => o.operator?.companyName).join(", ") || "—"}</td>
                <td className="px-5 py-3 text-gray-300">{a._count?.passengerBookings}</td>
                <td className="px-5 py-3 text-gray-300">{a._count?.freightBookings}</td>
                <td className="px-5 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[a.status]}`}>{a.status}</span>
                </td>
                <td className="px-5 py-3">
                  {a.status === "APPROVED" && (
                    <button onClick={() => action(a.id, "suspend")} disabled={acting === a.id}
                      className="text-xs text-amber-400 hover:text-amber-300">Suspend</button>
                  )}
                  {a.status === "SUSPENDED" && (
                    <button onClick={() => action(a.id, "approve")} disabled={acting === a.id}
                      className="text-xs text-green-400 hover:text-green-300">Reinstate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
