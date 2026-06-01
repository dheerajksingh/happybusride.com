"use client";

import { useEffect, useState } from "react";

const PLACEHOLDER_PRICING = `# Cab Service Pricing
# Format: Price, DistanceKm, VehicleType
Price, DistanceKm, VehicleType
80,    5,          Sedan
120,   10,         Sedan
200,   20,         Sedan
100,   5,          SUV
160,   10,         SUV
260,   20,         SUV
70,    5,          Hatchback
110,   10,         Hatchback
180,   20,         Hatchback
60,    5,          Auto
90,    10,         Auto
150,   20,         Auto`;

export default function AdminCabPricingPage() {
  const [configId, setConfigId] = useState<string | null>(null);
  const [pricingText, setPricingText] = useState(PLACEHOLDER_PRICING);
  const [generatedFn, setGeneratedFn] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [genPreview, setGenPreview] = useState("");

  const [testDist, setTestDist] = useState(10);
  const [testVehicle, setTestVehicle] = useState("Sedan");
  const [testResult, setTestResult] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/pricing/cab").then(r => r.json()).then(d => {
      if (d.config) {
        setConfigId(d.config.id);
        setPricingText(d.config.pricingText);
        setGeneratedFn(d.config.generatedFn ?? null);
        setGeneratedAt(d.config.generatedAt ?? null);
        setIsActive(d.config.isActive);
      }
    });
  }, []);

  async function savePricingText() {
    setSaving(true);
    const res = await fetch("/api/admin/pricing/cab", {
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

  async function generateFunction() {
    if (!configId) { setGenError("Save pricing rules first."); return; }
    setGenerating(true); setGenError(""); setGenPreview("");
    const res = await fetch("/api/admin/pricing/cab/generate", {
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

  function runTest() {
    if (!generatedFn) return;
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("distanceKm", "vehicleType", generatedFn);
      setTestResult(fn(testDist, testVehicle));
    } catch {
      setTestResult(null);
    }
  }

  const numCls = "w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none";
  const labelCls = "mb-1 block text-xs font-semibold text-gray-400";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Cab Pricing</h1>
        <p className="mt-1 text-sm text-gray-400">
          Define pricing rules for cab service. Claude generates the price calculator.
        </p>
      </div>

      <div className="rounded-xl bg-gray-800 border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-white">Pricing Rules</h2>
            <p className="text-xs text-gray-400 mt-0.5">Format: Price, DistanceKm, VehicleType (Sedan | SUV | Hatchback | Auto)</p>
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
          rows={12}
          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-sm text-green-400 font-mono placeholder-gray-600 focus:border-orange-500 focus:outline-none resize-none"
        />

        <div className="mt-3 flex gap-3">
          <button onClick={savePricingText} disabled={saving}
            className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-600 disabled:opacity-50">
            {saving ? "Saving…" : "💾 Save Rules"}
          </button>
          <button onClick={generateFunction} disabled={generating || !configId}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2">
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

      {generatedFn && (
        <div className="rounded-xl bg-gray-800 border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-white">Generated Calculator</h2>
              {generatedAt && <p className="text-xs text-gray-400 mt-0.5">Generated {new Date(generatedAt).toLocaleString("en-IN")}</p>}
            </div>
          </div>

          <pre className="rounded-lg bg-gray-900 border border-gray-700 px-4 py-3 text-xs text-green-400 font-mono overflow-x-auto max-h-48 mb-5">
            {generatedFn}
          </pre>

          <h3 className="text-sm font-semibold text-white mb-3">Test Calculator</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={labelCls}>Distance (km)</label>
              <input type="number" className={numCls} value={testDist}
                onChange={e => setTestDist(Number(e.target.value))} />
            </div>
            <div>
              <label className={labelCls}>Vehicle Type</label>
              <select className={numCls} value={testVehicle} onChange={e => setTestVehicle(e.target.value)}>
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Auto">Auto</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={runTest}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
              Run Test
            </button>
            {testResult !== null && (
              <div className="text-lg font-black text-orange-400">
                ₹{Math.round(testResult).toLocaleString("en-IN")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
