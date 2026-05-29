"use client";

import { useEffect, useState } from "react";

const PLACEHOLDER_PRICING = `# Freight Pricing Rules
# Format: Price, Weight (kg), Dimensions (cm), Distance (km)
# The LLM will read these rows and generate a price calculator function.

Price,  Weight,   Dimensions,        Distance
500,    5,        30x30x30,          100
800,    5,        30x30x30,          300
1200,   5,        30x30x30,          600
1000,   10,       30x30x30,          100
1500,   10,       30x30x30,          300
2000,   10,       30x30x30,          600
1500,   20,       60x60x60,          100
2500,   20,       60x60x60,          300
4000,   20,       60x60x60,          600
3000,   50,       100x100x100,       100
5000,   50,       100x100x100,       300
8000,   50,       100x100x100,       600`;

export default function AdminFreightPricingPage() {
  // ── Freight pricing state ──────────────────────────────────
  const [configId,     setConfigId]     = useState<string | null>(null);
  const [pricingText,  setPricingText]  = useState(PLACEHOLDER_PRICING);
  const [generatedFn,  setGeneratedFn]  = useState<string | null>(null);
  const [generatedAt,  setGeneratedAt]  = useState<string | null>(null);
  const [isActive,     setIsActive]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [generating,   setGenerating]   = useState(false);
  const [genError,     setGenError]     = useState("");
  const [genPreview,   setGenPreview]   = useState("");

  // Test calculator
  const [testWeight,   setTestWeight]   = useState(10);
  const [testVolume,   setTestVolume]   = useState(30000);
  const [testDist,     setTestDist]     = useState(200);
  const [testResult,   setTestResult]   = useState<number | null>(null);

  // ── Agent charges state ────────────────────────────────────
  const [charges, setCharges] = useState({
    agentOriginPct: 5, agentInterimPct: 10, agentFinalPct: 5,
    agentSeatBookingComm: 3, agentFreightComm: 5, perDayHoldingRate: 50,
  });
  const [savingCharges, setSavingCharges] = useState(false);
  const [savedCharges,  setSavedCharges]  = useState(false);

  useEffect(() => {
    // Load freight pricing config
    fetch("/api/admin/pricing/freight").then(r => r.json()).then(d => {
      if (d.config) {
        setConfigId(d.config.id);
        setPricingText(d.config.pricingText);
        setGeneratedFn(d.config.generatedFn ?? null);
        setGeneratedAt(d.config.generatedAt ?? null);
        setIsActive(d.config.isActive);
      }
    });
    // Load agent charges
    fetch("/api/admin/agent-charges").then(r => r.json()).then(d => {
      if (d.config) setCharges({
        agentOriginPct:       Number(d.config.agentOriginPct),
        agentInterimPct:      Number(d.config.agentInterimPct),
        agentFinalPct:        Number(d.config.agentFinalPct),
        agentSeatBookingComm: Number(d.config.agentSeatBookingComm),
        agentFreightComm:     Number(d.config.agentFreightComm),
        perDayHoldingRate:    Number(d.config.perDayHoldingRate),
      });
    });
  }, []);

  // ── Save pricing text ──────────────────────────────────────
  async function savePricingText() {
    setSaving(true);
    const res = await fetch("/api/admin/pricing/freight", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pricingText }),
    });
    const d = await res.json();
    if (res.ok) {
      setConfigId(d.config.id);
      setGeneratedFn(null);
      setIsActive(false);
      setGenPreview("");
    }
    setSaving(false);
  }

  // ── Generate via Claude ────────────────────────────────────
  async function generateFunction() {
    if (!configId) { setGenError("Save pricing rules first."); return; }
    setGenerating(true); setGenError(""); setGenPreview("");
    const res = await fetch("/api/admin/pricing/freight/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configId }),
    });
    const d = await res.json();
    setGenerating(false);
    if (!res.ok) { setGenError(d.error ?? "Generation failed"); return; }
    setGeneratedFn(d.config.generatedFn);
    setGeneratedAt(d.config.generatedAt);
    setIsActive(true);
    setGenPreview(d.preview ?? "");
  }

  // ── Test calculator ────────────────────────────────────────
  function runTest() {
    if (!generatedFn) return;
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("weightKg", "volumeCm3", "distanceKm", generatedFn);
      setTestResult(fn(testWeight, testVolume, testDist));
    } catch {
      setTestResult(null);
    }
  }

  // ── Save agent charges ─────────────────────────────────────
  async function saveCharges(e: React.FormEvent) {
    e.preventDefault();
    setSavingCharges(true);
    await fetch("/api/admin/agent-charges", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(charges),
    });
    setSavingCharges(false); setSavedCharges(true);
    setTimeout(() => setSavedCharges(false), 3000);
  }

  const inputCls = "w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none";
  const numCls   = "w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none";
  const labelCls = "mb-1 block text-xs font-semibold text-gray-400";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Freight Pricing</h1>
        <p className="mt-1 text-sm text-gray-400">
          Define pricing rules, generate a calculator with Claude, and configure agent charges.
        </p>
      </div>

      {/* ── Section 1: Pricing Rules ── */}
      <div className="rounded-xl bg-gray-800 border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-white">Pricing Rules</h2>
            <p className="text-xs text-gray-400 mt-0.5">Enter rate table as text. Claude will read this to generate the price calculator.</p>
          </div>
          {isActive && (
            <span className="rounded-full bg-green-900/50 px-3 py-1 text-xs font-semibold text-green-400">
              ✅ Calculator active
            </span>
          )}
        </div>

        <textarea
          value={pricingText}
          onChange={e => setPricingText(e.target.value)}
          rows={14}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-sm text-green-400 font-mono placeholder-gray-600 focus:border-amber-500 focus:outline-none resize-none"
          placeholder={PLACEHOLDER_PRICING}
        />

        <div className="mt-3 flex gap-3">
          <button onClick={savePricingText} disabled={saving}
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-600 disabled:opacity-50">
            {saving ? "Saving…" : "💾 Save Rules"}
          </button>
          <button onClick={generateFunction} disabled={generating || !configId}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
            {generating
              ? <><span className="animate-spin inline-block">⏳</span> Generating with Claude…</>
              : "⚡ Generate Price Calculator"}
          </button>
        </div>

        {genError && (
          <div className="mt-3 rounded-lg bg-red-900/40 border border-red-700 px-4 py-2 text-sm text-red-400">{genError}</div>
        )}
        {genPreview && (
          <div className="mt-3 rounded-lg bg-green-900/30 border border-green-700 px-4 py-2 text-sm text-green-400">
            ✅ Calculator generated · {genPreview}
          </div>
        )}
      </div>

      {/* ── Section 2: Generated Function + Test ── */}
      {generatedFn && (
        <div className="rounded-xl bg-gray-800 border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-white">Generated Calculator</h2>
              {generatedAt && <p className="text-xs text-gray-400 mt-0.5">Generated {new Date(generatedAt).toLocaleString("en-IN")}</p>}
            </div>
          </div>

          {/* Function code preview */}
          <pre className="rounded-lg bg-gray-900 border border-gray-700 px-4 py-3 text-xs text-green-400 font-mono overflow-x-auto max-h-48 mb-5">
            {generatedFn}
          </pre>

          {/* Test calculator */}
          <h3 className="text-sm font-semibold text-white mb-3">Test Calculator</h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className={labelCls}>Weight (kg)</label>
              <input type="number" className={numCls} value={testWeight}
                onChange={e => setTestWeight(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>Volume (cm³)</label>
              <input type="number" className={numCls} value={testVolume}
                onChange={e => setTestVolume(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>Distance (km)</label>
              <input type="number" className={numCls} value={testDist}
                onChange={e => setTestDist(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={runTest}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
              Run Test
            </button>
            {testResult !== null && (
              <div className="text-lg font-black text-amber-400">
                ₹{Math.round(testResult).toLocaleString("en-IN")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Section 3: Agent Charges ── */}
      <form onSubmit={saveCharges} className="rounded-xl bg-gray-800 border border-gray-700 p-6">
        <div className="mb-4">
          <h2 className="font-bold text-white">Agent Charges</h2>
          <p className="text-xs text-gray-400 mt-0.5">Percentages applied on top of freight cost. Per-day holding charge is flat.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {[
            { key: "agentOriginPct",       label: "Origin Handling (%)",        hint: "Agent picks up freight from sender" },
            { key: "agentInterimPct",      label: "Interim Transfer (%)",       hint: "Agent unloads + reloads at transfer stop" },
            { key: "agentFinalPct",        label: "Final Holding (%)",          hint: "Agent holds at destination per day" },
            { key: "agentSeatBookingComm", label: "Seat Booking Commission (%)", hint: "Agent books seat on behalf of passenger" },
            { key: "agentFreightComm",     label: "Freight Booking Comm. (%)",  hint: "Agent books freight on behalf of sender" },
          ].map(({ key, label, hint }) => (
            <div key={key}>
              <label className={labelCls}>{label}</label>
              <input type="number" step="0.5" min="0" max="50" className={numCls}
                value={charges[key as keyof typeof charges]}
                onChange={e => setCharges(c => ({ ...c, [key]: Number(e.target.value) }))} />
              <p className="text-xs text-gray-500 mt-1">{hint}</p>
            </div>
          ))}
          <div>
            <label className={labelCls}>Per-Day Holding Rate (₹)</label>
            <input type="number" min="0" className={numCls}
              value={charges.perDayHoldingRate}
              onChange={e => setCharges(c => ({ ...c, perDayHoldingRate: Number(e.target.value) }))} />
            <p className="text-xs text-gray-500 mt-1">Flat charge per day cargo is held at final destination</p>
          </div>
        </div>

        <button type="submit" disabled={savingCharges}
          className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
          {savingCharges ? "Saving…" : savedCharges ? "✅ Saved!" : "Save Agent Charges"}
        </button>
      </form>
    </div>
  );
}
