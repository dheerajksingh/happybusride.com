"use client";

import { useRef } from "react";

export interface BulkPassenger {
  name: string;
  age: string;
  gender: string;
  seatId?: string;
}

interface BulkPassengerFormProps {
  passengers: BulkPassenger[];
  onUpdate: (passengers: BulkPassenger[]) => void;
  maxPassengers?: number;
}

export function BulkPassengerForm({ passengers, onUpdate, maxPassengers = 50 }: BulkPassengerFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  function addPassenger() {
    if (passengers.length >= maxPassengers) return;
    onUpdate([...passengers, { name: "", age: "", gender: "M" }]);
  }

  function removePassenger(index: number) {
    onUpdate(passengers.filter((_, i) => i !== index));
  }

  function updateField(index: number, field: keyof BulkPassenger, value: string) {
    const next = [...passengers];
    next[index] = { ...next[index], [field]: value };
    onUpdate(next);
  }

  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      const parsed: BulkPassenger[] = [];
      for (const line of lines) {
        if (line.toLowerCase().startsWith("name")) continue; // skip header
        const parts = line.split(",").map(p => p.trim());
        if (parts.length >= 2) {
          parsed.push({
            name: parts[0] ?? "",
            age: parts[1] ?? "",
            gender: (parts[2] ?? "M").toUpperCase() === "F" ? "F" : (parts[2] ?? "M").toUpperCase() === "OTHER" ? "Other" : "M",
          });
        }
      }
      const available = maxPassengers - passengers.length;
      onUpdate([...passengers, ...parsed.slice(0, available)]);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const inputCls = "rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="text-sm text-gray-500">{passengers.length} passenger{passengers.length !== 1 ? "s" : ""}</span>
        <button type="button" onClick={addPassenger} disabled={passengers.length >= maxPassengers}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          + Add Passenger
        </button>
        <button type="button" onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
          📎 Upload CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
        <span className="text-xs text-gray-400">CSV format: name,age,gender</span>
      </div>

      {passengers.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
          Add passengers or upload a CSV file
        </div>
      )}

      {passengers.length > 0 && (
        <div className="space-y-2">
          {passengers.map((p, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <span className="w-6 text-xs text-gray-400 shrink-0">{i + 1}</span>
              <input
                placeholder="Full Name"
                className={`${inputCls} flex-1`}
                value={p.name}
                onChange={e => updateField(i, "name", e.target.value)}
              />
              <input
                type="number"
                placeholder="Age"
                className={`${inputCls} w-20`}
                value={p.age}
                onChange={e => updateField(i, "age", e.target.value)}
              />
              <select
                className={`${inputCls} w-24`}
                value={p.gender}
                onChange={e => updateField(i, "gender", e.target.value)}
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
              <button type="button" onClick={() => removePassenger(i)}
                className="ml-1 text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
