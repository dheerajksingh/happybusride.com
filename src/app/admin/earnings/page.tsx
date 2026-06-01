"use client";
import { useEffect, useState } from "react";
import { PageSpinner } from "@/components/ui/Spinner";

export default function AdminEarningsPage() {
  const [data, setData] = useState<any>(null);
  const [view, setView] = useState<"monthly" | "daily">("monthly");
  const [loading, setLoading] = useState(true);
  const [expandedOp, setExpandedOp] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [expandedShuttle, setExpandedShuttle] = useState<string | null>(null);
  const [tab, setTab] = useState<"operators" | "agents" | "shuttle">("operators");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/earnings?view=${view}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [view]);

  if (loading) return <PageSpinner />;

  const { operators = [], agents = [], shuttleOperators = [], platformTotals } = data ?? {};

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Earnings Overview</h1>
          <p className="text-sm text-gray-400">Platform-wide income across operators, agents and shuttle operators</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-gray-700 p-1">
          {(["monthly", "daily"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors capitalize ${view === v ? "bg-white text-gray-900 shadow" : "text-gray-400 hover:text-white"}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Platform summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Operator Gross", value: platformTotals?.operatorGross ?? 0, color: "text-blue-400" },
          { label: "Platform Commission", value: platformTotals?.platformCommission ?? 0, color: "text-yellow-400" },
          { label: "Total Agent Earnings", value: platformTotals?.agentTotal ?? 0, color: "text-green-400" },
          { label: "Shuttle Operator Earnings", value: platformTotals?.shuttleTotal ?? 0, color: "text-teal-400" },
        ].map(c => (
          <div key={c.label} className="rounded-xl bg-gray-800 p-5">
            <p className="text-sm text-gray-400">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>₹{Number(c.value).toLocaleString("en-IN")}</p>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="mb-4 flex gap-1 rounded-xl bg-gray-700 p-1 w-fit">
        {(["operators", "agents", "shuttle"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-5 py-1.5 text-sm font-semibold capitalize transition-colors ${tab === t ? "bg-white text-gray-900 shadow" : "text-gray-400 hover:text-white"}`}>
            {t === "shuttle" ? `Shuttle (${shuttleOperators.length})` : t === "operators" ? `Operators (${operators.length})` : `Agents (${agents.length})`}
          </button>
        ))}
      </div>

      {/* Operators tab */}
      {tab === "operators" && (
        operators.length === 0 ? (
          <div className="rounded-xl bg-gray-800 p-12 text-center text-gray-500">No operator earnings yet.</div>
        ) : (
          <div className="space-y-3">
            {operators.map((op: any) => (
              <div key={op.id} className="rounded-xl bg-gray-800 overflow-hidden">
                <button
                  onClick={() => setExpandedOp(expandedOp === op.id ? null : op.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-750 transition-colors">
                  <div className="text-left">
                    <div className="font-semibold text-white">{op.companyName}</div>
                    <div className="text-xs text-gray-400">Net payout: ₹{Number(op.totalNet).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-bold text-blue-400">₹{Number(op.totalGross).toLocaleString("en-IN")}</div>
                      <div className="text-xs text-gray-500">passenger gross</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-amber-400">₹{Number(op.freightEarnings).toLocaleString("en-IN")}</div>
                      <div className="text-xs text-gray-500">freight</div>
                    </div>
                    <span className="text-gray-500">{expandedOp === op.id ? "▲" : "▼"}</span>
                  </div>
                </button>
                {expandedOp === op.id && (
                  <div className="border-t border-gray-700 px-5 pb-4">
                    <p className="text-xs uppercase text-gray-500 mt-3 mb-2 font-semibold">
                      {view === "monthly" ? "Monthly" : "Daily"} Breakdown
                    </p>
                    {op.periods.length === 0 ? (
                      <p className="text-sm text-gray-500">No data.</p>
                    ) : (
                      <div className="space-y-1">
                        <div className="grid grid-cols-4 text-xs text-gray-500 font-semibold pb-1 border-b border-gray-700">
                          <span>Period</span>
                          <span className="text-right">Passenger Gross</span>
                          <span className="text-right">Freight</span>
                          <span className="text-right">Net Payout</span>
                        </div>
                        {op.periods.map((p: any, i: number) => (
                          <div key={i} className="grid grid-cols-4 text-sm py-1 border-b border-gray-700 last:border-0">
                            <span className="text-gray-300">{p.label}</span>
                            <span className="text-right text-blue-400">₹{Number(p.gross).toLocaleString("en-IN")}</span>
                            <span className="text-right text-amber-400">₹{Number(p.freight ?? 0).toLocaleString("en-IN")}</span>
                            <span className="text-right text-green-400">₹{Number(p.net).toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Agents tab */}
      {tab === "agents" && (
        agents.length === 0 ? (
          <div className="rounded-xl bg-gray-800 p-12 text-center text-gray-500">No agent earnings yet.</div>
        ) : (
          <div className="space-y-3">
            {agents.map((ag: any) => (
              <div key={ag.id} className="rounded-xl bg-gray-800 overflow-hidden">
                <button
                  onClick={() => setExpandedAgent(expandedAgent === ag.id ? null : ag.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-750 transition-colors">
                  <div className="text-left">
                    <div className="font-semibold text-white">{ag.fullName}</div>
                    <div className="text-xs text-gray-400">
                      Settled: ₹{Number(ag.settled).toLocaleString("en-IN")} &nbsp;·&nbsp;
                      Pending: ₹{Number(ag.pending).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400">₹{Number(ag.total).toLocaleString("en-IN")}</div>
                      <div className="text-xs text-gray-500">total earned</div>
                    </div>
                    <span className="text-gray-500">{expandedAgent === ag.id ? "▲" : "▼"}</span>
                  </div>
                </button>
                {expandedAgent === ag.id && (
                  <div className="border-t border-gray-700 px-5 pb-4">
                    <p className="text-xs uppercase text-gray-500 mt-3 mb-2 font-semibold">
                      {view === "monthly" ? "Monthly" : "Daily"} Breakdown
                    </p>
                    {ag.periods.length === 0 ? (
                      <p className="text-sm text-gray-500">No data.</p>
                    ) : (
                      <div className="space-y-1">
                        {ag.periods.map((p: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-700 last:border-0">
                            <span className="text-gray-300">{p.label}</span>
                            <span className="text-green-400">₹{Number(p.total).toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Shuttle tab */}
      {tab === "shuttle" && (
        shuttleOperators.length === 0 ? (
          <div className="rounded-xl bg-gray-800 p-12 text-center text-gray-500">No shuttle operator earnings yet.</div>
        ) : (
          <div className="space-y-3">
            {shuttleOperators.map((so: any) => (
              <div key={so.id} className="rounded-xl bg-gray-800 overflow-hidden">
                <button
                  onClick={() => setExpandedShuttle(expandedShuttle === so.id ? null : so.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-750 transition-colors">
                  <div className="font-semibold text-white">{so.fullName}</div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-teal-400">₹{Number(so.total).toLocaleString("en-IN")}</div>
                      <div className="text-xs text-gray-500">total earned</div>
                    </div>
                    <span className="text-gray-500">{expandedShuttle === so.id ? "▲" : "▼"}</span>
                  </div>
                </button>
                {expandedShuttle === so.id && (
                  <div className="border-t border-gray-700 px-5 pb-4">
                    <p className="text-xs uppercase text-gray-500 mt-3 mb-2 font-semibold">
                      {view === "monthly" ? "Monthly" : "Daily"} Breakdown
                    </p>
                    {so.periods.length === 0 ? (
                      <p className="text-sm text-gray-500">No data.</p>
                    ) : (
                      <div className="space-y-1">
                        {so.periods.map((p: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-700 last:border-0">
                            <span className="text-gray-300">{p.label}</span>
                            <span className="text-teal-400">₹{Number(p.total).toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>
                    )}
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
