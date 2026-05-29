"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CityAutocomplete } from "@/components/ui/CityAutocomplete";
import type { City } from "@/components/ui/CityAutocomplete";

const WEIGHT_OPTIONS  = [5,10,15,20,25,30,40,50,75,100];
const DIM_OPTIONS     = [30,40,50,60,70,80,90,100,120,150,200];

export default function FreightSearchPage() {
  const router = useRouter();
  const [from, setFrom] = useState<City | null>(null);
  const [to, setTo]     = useState<City | null>(null);
  const [date, setDate] = useState("");
  const [weight, setWeight]   = useState(5);
  const [length, setLength]   = useState(30);
  const [breadth, setBreadth] = useState(30);
  const [height, setHeight]   = useState(30);
  const [error, setError] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to) { setError("Please select both cities."); return; }
    if (!date) { setError("Please select a shipping date."); return; }
    if (from.id === to.id) { setError("From and To cities must be different."); return; }
    const params = new URLSearchParams({
      from: from.id, fromName: from.name,
      to:   to.id,   toName:   to.name,
      date,
      weight: String(weight),
      length: String(length),
      breadth: String(breadth),
      height:  String(height),
    });
    router.push(`/freight/results?${params}`);
  }

  const volume = (length * breadth * height / 1000).toFixed(0);
  const selectCls = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 text-center">
        <div className="mb-2 text-4xl">📦</div>
        <h1 className="text-3xl font-black text-gray-900">Ship Freight</h1>
        <p className="mt-2 text-gray-500">Send cargo with intercity buses — fast and affordable</p>
      </div>

      <form onSubmit={handleSearch} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <CityAutocomplete label="From City" value={from?.name ?? ""} onChange={setFrom} placeholder="Origin city…" />
          <CityAutocomplete label="To City"   value={to?.name   ?? ""} onChange={setTo}   placeholder="Destination city…" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Shipping Date</label>
          <input type="date" required value={date} onChange={e => setDate(e.target.value)}
            min={new Date().toISOString().slice(0,10)}
            className={selectCls} />
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-gray-700">Cargo Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Weight (kg)</label>
              <select value={weight} onChange={e => setWeight(Number(e.target.value))} className={selectCls}>
                {WEIGHT_OPTIONS.map(w => <option key={w} value={w}>{w} kg</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Length (cm)</label>
              <select value={length} onChange={e => setLength(Number(e.target.value))} className={selectCls}>
                {DIM_OPTIONS.map(d => <option key={d} value={d}>{d} cm</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Breadth (cm)</label>
              <select value={breadth} onChange={e => setBreadth(Number(e.target.value))} className={selectCls}>
                {DIM_OPTIONS.map(d => <option key={d} value={d}>{d} cm</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Height (cm)</label>
              <select value={height} onChange={e => setHeight(Number(e.target.value))} className={selectCls}>
                {DIM_OPTIONS.map(d => <option key={d} value={d}>{d} cm</option>)}
              </select>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {weight} kg · {length}×{breadth}×{height} cm · {volume} litres
          </p>
        </div>

        {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

        <button type="submit"
          className="w-full rounded-xl bg-amber-500 py-3 text-base font-bold text-white hover:bg-amber-600">
          Find Shipping Options
        </button>
      </form>

      <div className="mt-6 grid grid-cols-3 gap-4 text-center text-sm">
        {[["📍","Multi-city routing","Freight follows the best bus chain to your destination"],
          ["🤝","Agent-managed","Local agents handle transfers at each stop"],
          ["📱","Track anytime","Recipient gets a QR code to track and collect"]].map(([icon,title,desc]) => (
          <div key={title as string} className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="font-semibold text-gray-800">{title}</div>
            <div className="text-xs text-gray-500 mt-1">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
