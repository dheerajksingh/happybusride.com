"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CityAutocomplete } from "@/components/ui/CityAutocomplete";
import type { City } from "@/components/ui/CityAutocomplete";
import { buildBookingLegs } from "@/lib/freight-legs";

const WEIGHT_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
const DIM_OPTIONS    = [30, 40, 50, 60, 70, 80, 90, 100, 120, 150, 200];

const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none";
const labelCls = "mb-1 block text-sm font-medium text-gray-700";

type Step = 1 | 2 | 3;

export default function AgentFreightWalkInPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — bus search (route, date, cargo)
  const [from, setFrom]     = useState<City | null>(null);
  const [to, setTo]         = useState<City | null>(null);
  const [date, setDate]     = useState("");
  const [weight, setWeight] = useState(5);
  const [length, setLength] = useState(30);
  const [breadth, setBreadth] = useState(30);
  const [height, setHeight]   = useState(30);
  const [itemDescription, setItemDescription] = useState("");
  const [searching, setSearching] = useState(false);
  const [options, setOptions]     = useState<any[]>([]);

  // Step 2 — selected option
  const [selected, setSelected] = useState<any>(null);

  // Step 3 — sender + recipient
  const [sender, setSender] = useState({ name: "", phone: "", email: "", whatsapp: "", address: "" });
  const [recipient, setRecipient] = useState({
    name: "", phone: "", whatsapp: "", email: "", address: "",
  });

  // ── Step 1: search buses for the shipping date ────────────────
  // A booking can only proceed when a bus runs on the date AND an agent
  // is available on every leg (origin, transfers, destination). The search
  // API enforces this; here we only carry forward when it returns options.

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!from || !to) { setError("Select both cities"); return; }
    if (from.id === to.id) { setError("From and To cities must be different"); return; }
    if (!date)        { setError("Select shipping date"); return; }
    setSearching(true);

    const q = new URLSearchParams({
      from: from.id, to: to.id, date,
      weight: String(weight), length: String(length),
      breadth: String(breadth), height: String(height),
    });
    const res = await fetch(`/api/freight/search?${q}`);
    const data = await res.json();
    setSearching(false);

    if (!data.options?.length) {
      const msg = data.availableDates?.length
        ? `No bus + agent coverage on this date. Try: ${data.availableDates.join(", ")}`
        : "No bus available with agent coverage on every leg for this route.";
      setError(msg);
      setOptions([]);
      return;
    }
    setOptions(data.options);
    setSelected(null);
    setStep(2);
  }

  function validateDetails() {
    if (!sender.name.trim())        { setError("Sender name is required"); return false; }
    if (sender.phone.length < 10)   { setError("Valid sender phone required (min 10 digits)"); return false; }
    if (!sender.address.trim())     { setError("Sender address is required"); return false; }
    if (!recipient.name.trim())     { setError("Recipient name required"); return false; }
    if (recipient.phone.length < 10){ setError("Valid recipient phone required"); return false; }
    if (!recipient.address.trim())  { setError("Recipient address required"); return false; }
    return true;
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selected) { setError("Select a shipping option first"); setStep(2); return; }
    if (!validateDetails()) return;

    setSubmitting(true);

    const legs = buildBookingLegs(selected.legs, selected.transfers, selected.originCharge);

    const res = await fetch("/api/agent/freight/book-walkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender,
        fromCityId:   from!.id,
        toCityId:     to!.id,
        shippingDate: date,
        items: [{ description: itemDescription || "General cargo", weightKg: weight, lengthCm: length, breadthCm: breadth, heightCm: height }],
        legs,
        freightCost:       selected.freightCost,
        agentCost:         selected.agentCost,
        recipientName:     recipient.name,
        recipientPhone:    recipient.phone,
        recipientWhatsapp: recipient.whatsapp,
        recipientEmail:    recipient.email,
        recipientAddress:  recipient.address,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) { setError(data.error ?? "Booking failed"); return; }
    router.push(`/agent/freight/book-walkin/success?ref=${data.bookingRef}&total=${data.totalCost}&origin=${data.originCharge}`);
  }

  // ── Render ────────────────────────────────────────────────────

  const stepLabels = ["Buses", "Options", "Sender & Recipient"];

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.push("/agent/freight")} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Book for Walk-in Customer</h1>
          <p className="text-sm text-gray-500">Find a bus with agent coverage first, then add sender & recipient</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {stepLabels.map((label, i) => {
          const s = (i + 1) as Step;
          const done = step > s;
          const active = step === s;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                done ? "bg-green-500 text-white" : active ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {done ? "✓" : s}
              </div>
              <span className={`text-sm ${active ? "font-semibold text-gray-900" : "text-gray-400"}`}>{label}</span>
              {i < stepLabels.length - 1 && <div className="h-px w-6 bg-gray-200" />}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">{error}</div>
      )}

      {/* ── Step 1: Bus search ── */}
      {step === 1 && (
        <form onSubmit={handleSearch} className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Search Buses</h2>
          <p className="text-xs text-gray-500">
            We&apos;ll only show options where a bus runs on the shipping date and an agent
            is available at the origin, every transfer, and the destination.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <CityAutocomplete label="From City" value={from?.name ?? ""} onChange={setFrom} placeholder="Origin city…" />
            <CityAutocomplete label="To City"   value={to?.name   ?? ""} onChange={setTo}   placeholder="Destination city…" />
          </div>
          <div>
            <label className={labelCls}>Shipping Date *</label>
            <input type="date" required className={inputCls} value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Item Description</label>
            <input className={inputCls} value={itemDescription} onChange={e => setItemDescription(e.target.value)} placeholder="e.g. Electronics, documents, clothing…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Weight (kg)</label>
              <select className={inputCls} value={weight} onChange={e => setWeight(Number(e.target.value))}>
                {WEIGHT_OPTIONS.map(w => <option key={w} value={w}>{w} kg</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Length (cm)</label>
              <select className={inputCls} value={length} onChange={e => setLength(Number(e.target.value))}>
                {DIM_OPTIONS.map(d => <option key={d} value={d}>{d} cm</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Breadth (cm)</label>
              <select className={inputCls} value={breadth} onChange={e => setBreadth(Number(e.target.value))}>
                {DIM_OPTIONS.map(d => <option key={d} value={d}>{d} cm</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Height (cm)</label>
              <select className={inputCls} value={height} onChange={e => setHeight(Number(e.target.value))}>
                {DIM_OPTIONS.map(d => <option key={d} value={d}>{d} cm</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={searching} className="w-full rounded-xl bg-orange-500 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-50">
            {searching ? "Searching…" : "Find Buses →"}
          </button>
        </form>
      )}

      {/* ── Step 2: Pick option ── */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900">Choose a Shipping Option</h2>
          {options.map((opt, i) => (
            <div key={i}
              onClick={() => { setSelected(opt); setError(""); setStep(3); }}
              className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-orange-400 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${opt.type === "DIRECT" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {opt.type === "DIRECT" ? "Direct" : `Via ${opt.transfers[0]?.cityName}`}
                </span>
                <span className="text-lg font-black text-orange-600">₹{opt.totalCost.toLocaleString("en-IN")}</span>
              </div>
              {opt.legs.map((leg: any, li: number) => (
                <div key={li} className="text-sm text-gray-700">
                  Bus {li + 1}: {leg.fromCityName} → {leg.toCityName}
                  <span className="ml-2 text-xs text-gray-400">({leg.busName} · {leg.distanceKm} km)</span>
                </div>
              ))}
              {opt.transfers.map((t: any, ti: number) => (
                <div key={ti} className="ml-3 mt-1 text-xs text-gray-500">
                  Transfer at {t.cityName} — Agent: {t.agentName} ({t.agentPhone})
                </div>
              ))}
              <div className="mt-2 flex gap-4 text-xs text-gray-400">
                <span>Freight: ₹{opt.freightCost}</span>
                {opt.agentCost > 0 && <span>Agent handling: ₹{opt.agentCost}</span>}
                <span>Available: {opt.availableKg} kg</span>
              </div>
            </div>
          ))}
          <button onClick={() => setStep(1)} className="w-full rounded-xl border border-gray-300 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">← Modify Search</button>
        </div>
      )}

      {/* ── Step 3: Sender + Recipient + confirm ── */}
      {step === 3 && selected && (
        <form onSubmit={handleConfirm} className="space-y-4">
          {/* Selected option summary */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <div className="font-semibold text-amber-800 mb-1">
              {selected.type === "DIRECT" ? "Direct" : "Via Transfer"} · {from?.name} → {to?.name} · {date}
            </div>
            {selected.legs.map((l: any, i: number) => (
              <div key={i} className="text-amber-700 text-xs">{l.fromCityName} → {l.toCityName} ({l.busName})</div>
            ))}
            <button type="button" onClick={() => setStep(2)} className="mt-1 text-xs text-amber-600 underline">Change option</button>
          </div>

          {/* Sender details */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Sender Details</h2>
            <p className="text-xs text-gray-500">
              A platform account will be created for this person using their phone number.
              They can log in later via OTP to track their shipment.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input className={inputCls} value={sender.name} onChange={e => setSender(p => ({ ...p, name: e.target.value }))} placeholder="Sender's full name" />
              </div>
              <div>
                <label className={labelCls}>Phone Number *</label>
                <input className={inputCls} type="tel" value={sender.phone} onChange={e => setSender(p => ({ ...p, phone: e.target.value }))} placeholder="10-digit mobile number" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Email</label>
                <input className={inputCls} type="email" value={sender.email} onChange={e => setSender(p => ({ ...p, email: e.target.value }))} placeholder="optional" />
              </div>
              <div>
                <label className={labelCls}>WhatsApp</label>
                <input className={inputCls} type="tel" value={sender.whatsapp} onChange={e => setSender(p => ({ ...p, whatsapp: e.target.value }))} placeholder="If different from phone" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Sender Address *</label>
              <textarea rows={2} className={inputCls} value={sender.address} onChange={e => setSender(p => ({ ...p, address: e.target.value }))} placeholder="House / street / area of sender" />
            </div>
          </div>

          {/* Recipient details */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Recipient Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input className={inputCls} value={recipient.name} onChange={e => setRecipient(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Phone *</label>
                <input type="tel" className={inputCls} value={recipient.phone} onChange={e => setRecipient(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>WhatsApp</label>
                <input type="tel" className={inputCls} value={recipient.whatsapp} onChange={e => setRecipient(p => ({ ...p, whatsapp: e.target.value }))} placeholder="If different from phone" />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" className={inputCls} value={recipient.email} onChange={e => setRecipient(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Collection Address *</label>
              <textarea rows={2} className={inputCls} value={recipient.address} onChange={e => setRecipient(p => ({ ...p, address: e.target.value }))}
                placeholder="Address where recipient will collect the freight" />
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Cost Breakdown</h2>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600"><span>Freight charge</span><span>₹{selected.freightCost.toLocaleString("en-IN")}</span></div>
              {selected.agentCost > 0 && (
                <div className="flex justify-between text-gray-600"><span>Transfer agent handling</span><span>₹{selected.agentCost.toLocaleString("en-IN")}</span></div>
              )}
              <div className="flex justify-between text-orange-700 font-medium">
                <span>Your origin handling fee</span>
                <span>₹{Math.round(selected.freightCost * 0.05).toLocaleString("en-IN")} <span className="text-xs font-normal text-gray-400">(~5%)</span></span>
              </div>
            </div>
            <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 font-bold text-gray-900">
              <span>Total charged to sender</span>
              <span className="text-orange-600">
                ₹{(selected.freightCost + selected.agentCost + Math.round(selected.freightCost * 0.05)).toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
            ℹ️ Booking is auto-confirmed. The sender ({sender.name || "—"}, {sender.phone || "—"}) gets a platform account and can track their shipment via OTP login.
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50">← Back</button>
            <button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600 disabled:opacity-50">
              {submitting ? "Confirming…" : "Confirm Booking"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
