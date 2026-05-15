"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BUS_TYPES = [
  { value: "AC_SEATER", label: "AC Seater" },
  { value: "NON_AC_SEATER", label: "Non-AC Seater" },
  { value: "AC_SLEEPER", label: "AC Sleeper" },
  { value: "LUXURY", label: "Luxury" },
];

const CAPACITY_OPTIONS = [
  { value: 12, label: "Mini (12 seats)" },
  { value: 40, label: "Mid-size (40 seats)" },
  { value: 50, label: "Large (50 seats)" },
  { value: 70, label: "Double Decker (70 seats)" },
];

type Employee = { name: string; address: string; phone: string };

export default function NewCorporateRequestPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);

  const [form, setForm] = useState({
    city: "",
    state: "",
    busType: "",
    seatCapacityMin: "",
    hasAc: false,
    hasWifi: false,
    officeAddress: "",
    arrivalTime: "09:00",
    departureTime: "18:00",
    maxTravelMins: "",
    clusterRadiusKm: "1.5",
    startDate: "",
    notes: "",
  });

  const [employees, setEmployees] = useState<Employee[]>([
    { name: "", address: "", phone: "" },
  ]);

  function updateForm(field: string, value: any) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateEmployee(idx: number, field: keyof Employee, value: string) {
    setEmployees((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  }

  function addEmployee() {
    setEmployees((prev) => [...prev, { name: "", address: "", phone: "" }]);
  }

  function removeEmployee(idx: number) {
    setEmployees((prev) => prev.filter((_, i) => i !== idx));
  }

  function parseCsvRow(row: string): string[] {
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        // doubled quote inside a quoted field = literal quote
        if (inQuotes && row[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());
    return cols;
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = text.split(/\r?\n/).slice(1).filter(Boolean);
    const parsed: Employee[] = rows
      .map((row) => {
        const cols = parseCsvRow(row);
        return { name: cols[0] ?? "", address: cols[1] ?? "", phone: cols[2] ?? "" };
      })
      .filter((e) => e.name && e.address);
    if (parsed.length) setEmployees(parsed);
  }

  async function createRequest() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/corporate/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        seatCapacityMin: form.seatCapacityMin ? parseInt(form.seatCapacityMin) : undefined,
        maxTravelMins: form.maxTravelMins ? parseInt(form.maxTravelMins) : undefined,
        clusterRadiusKm: form.clusterRadiusKm ? parseFloat(form.clusterRadiusKm) : 1.5,
        busType: form.busType || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Failed to create request"); return false; }
    setRequestId(data.request.id);
    return data.request.id;
  }

  async function submitEmployees(id: string) {
    const valid = employees.filter((e) => e.name && e.address);
    if (!valid.length) return true;
    const res = await fetch(`/api/corporate/requests/${id}/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employees: valid, replace: true }),
    });
    return res.ok;
  }

  async function handleFinalSubmit() {
    setLoading(true);
    setError("");

    let id = requestId;
    if (!id) {
      id = await createRequest();
      if (!id) return;
    }

    const empOk = await submitEmployees(id);
    if (!empOk) { setError("Failed to save employees"); setLoading(false); return; }

    // Mark as submitted
    await fetch(`/api/corporate/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SUBMITTED" }),
    });

    setLoading(false);
    router.push(`/corporate/request/${id}`);
  }

  const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link href="/" className="text-xs font-black text-violet-700 hover:opacity-80 mr-1">HappyBusRide</Link>
          <span className="text-gray-300">/</span>
          <Link href="/corporate/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">Dashboard</Link>
          <span className="text-gray-300">/</span>
          <span className="font-bold text-gray-900 text-sm">New Request</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Stepper */}
        <div className="mb-8 flex items-center gap-2">
          {["Route & Schedule", "Employees", "Review & Submit"].map((s, i) => (
            <div key={s} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${step > i + 1 ? "bg-green-500 text-white" : step === i + 1 ? "bg-violet-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                <span className={`whitespace-nowrap text-xs ${step === i + 1 ? "font-semibold text-violet-600" : "text-gray-400"}`}>{s}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 mx-2 mb-4 ${step > i + 1 ? "bg-green-400" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {/* Step 1: Route & Schedule */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-900">Route &amp; Schedule Details</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>City *</label>
                  <input className={inputClass} required value={form.city} onChange={(e) => updateForm("city", e.target.value)} placeholder="Bengaluru" />
                </div>
                <div>
                  <label className={labelClass}>State *</label>
                  <input className={inputClass} required value={form.state} onChange={(e) => updateForm("state", e.target.value)} placeholder="Karnataka" />
                </div>
              </div>

              <div>
                <label className={labelClass}>Office Address *</label>
                <input className={inputClass} required value={form.officeAddress} onChange={(e) => updateForm("officeAddress", e.target.value)} placeholder="123, MG Road, Bengaluru — 560001" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Office Arrival Time *</label>
                  <input type="time" className={inputClass} value={form.arrivalTime} onChange={(e) => updateForm("arrivalTime", e.target.value)} />
                  <p className="mt-1 text-xs text-gray-400">Employees must reach office by this time</p>
                </div>
                <div>
                  <label className={labelClass}>End of Day / Departure Time *</label>
                  <input type="time" className={inputClass} value={form.departureTime} onChange={(e) => updateForm("departureTime", e.target.value)} />
                  <p className="mt-1 text-xs text-gray-400">Return drop-off starts at this time</p>
                </div>
              </div>

              <div>
                <label className={labelClass}>Max Travel Time per Employee (minutes)</label>
                <input type="number" className={inputClass} value={form.maxTravelMins} onChange={(e) => updateForm("maxTravelMins", e.target.value)} placeholder="60" min={15} max={180} />
                <p className="mt-1 text-xs text-gray-400">Each bus route will stay within this travel time. More buses are created if needed.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelClass} style={{ marginBottom: 0 }}>Pickup Stop Cluster Radius</label>
                  <span className="text-sm font-bold text-violet-700">{form.clusterRadiusKm} km</span>
                </div>
                <input
                  type="range" min="0.5" max="5" step="0.5"
                  value={form.clusterRadiusKm}
                  onChange={(e) => updateForm("clusterRadiusKm", e.target.value)}
                  className="w-full accent-violet-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0.5 km (dense city)</span>
                  <span>2.5 km (balanced)</span>
                  <span>5 km (suburban)</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Employees within this distance of each other share one pickup stop. Smaller radius = more stops, larger = fewer stops with more walking.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Bus Type Preference</label>
                  <select className={inputClass} value={form.busType} onChange={(e) => updateForm("busType", e.target.value)}>
                    <option value="">Any Type</option>
                    {BUS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Minimum Seat Capacity</label>
                  <select className={inputClass} value={form.seatCapacityMin} onChange={(e) => updateForm("seatCapacityMin", e.target.value)}>
                    <option value="">Any Size</option>
                    {CAPACITY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.hasAc} onChange={(e) => updateForm("hasAc", e.target.checked)} className="h-4 w-4 rounded text-violet-600" />
                  <span className="text-sm text-gray-700">AC Required</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.hasWifi} onChange={(e) => updateForm("hasWifi", e.target.checked)} className="h-4 w-4 rounded text-violet-600" />
                  <span className="text-sm text-gray-700">WiFi Required</span>
                </label>
              </div>

              <div>
                <label className={labelClass}>Service Start Date *</label>
                <input type="date" className={inputClass} value={form.startDate} onChange={(e) => updateForm("startDate", e.target.value)} min={new Date().toISOString().split("T")[0]} />
              </div>

              <div>
                <label className={labelClass}>Additional Notes</label>
                <textarea className={inputClass} rows={3} value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} placeholder="Any special requirements…" />
              </div>

              <button
                onClick={() => {
                  if (!form.city || !form.state || !form.officeAddress || !form.startDate) {
                    setError("Please fill in all required fields.");
                    return;
                  }
                  setError("");
                  setStep(2);
                }}
                className="w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Next: Add Employees →
              </button>
              {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}
            </div>
          )}

          {/* Step 2: Employees */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">Employee Addresses</h2>
                <span className="text-sm text-gray-500">{employees.filter(e => e.name && e.address).length} employees</span>
              </div>

              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
                <p className="mb-2 text-sm font-medium text-gray-700">Upload CSV file</p>
                <p className="mb-3 text-xs text-gray-400">Columns: Name, Address, Phone (optional) — one employee per row</p>
                <input type="file" accept=".csv" onChange={handleCsvUpload} className="text-sm text-gray-600" />
              </div>

              <div className="text-center text-xs text-gray-400">— or enter manually —</div>

              <div className="space-y-3 max-h-72 overflow-y-auto">
                {employees.map((emp, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-4">
                      <input
                        className={inputClass}
                        placeholder="Employee name"
                        value={emp.name}
                        onChange={(e) => updateEmployee(idx, "name", e.target.value)}
                      />
                    </div>
                    <div className="col-span-5">
                      <input
                        className={inputClass}
                        placeholder="Home address"
                        value={emp.address}
                        onChange={(e) => updateEmployee(idx, "address", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        className={inputClass}
                        placeholder="Phone"
                        value={emp.phone}
                        onChange={(e) => updateEmployee(idx, "phone", e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEmployee(idx)}
                      className="col-span-1 mt-0.5 text-gray-400 hover:text-red-500"
                      disabled={employees.length === 1}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addEmployee}
                className="text-sm font-medium text-violet-600 hover:underline"
              >
                + Add another employee
              </button>

              {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  ← Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700">
                  Next: Review →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-bold text-gray-900">Review &amp; Submit</h2>

              <div className="rounded-lg bg-violet-50 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">City</span><span className="font-medium">{form.city}, {form.state}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Office</span><span className="font-medium text-right max-w-xs">{form.officeAddress}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Timings</span><span className="font-medium">{form.arrivalTime} arrival · {form.departureTime} departure</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Start Date</span><span className="font-medium">{form.startDate}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Bus Type</span><span className="font-medium">{form.busType || "Any"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Max travel time</span><span className="font-medium">{form.maxTravelMins ? `${form.maxTravelMins} min` : "Not specified"}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Cluster radius</span><span className="font-medium">{form.clusterRadiusKm} km</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Employees</span><span className="font-medium">{employees.filter(e => e.name && e.address).length} added</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Amenities</span><span className="font-medium">{[form.hasAc && "AC", form.hasWifi && "WiFi"].filter(Boolean).join(", ") || "None specified"}</span></div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                Submitting this request will notify matching operators in {form.city}. They will respond with quotes within 24–48 hours. You can chat with operators before accepting.
              </div>

              {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  ← Back
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {loading ? "Submitting…" : "Submit Request"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
