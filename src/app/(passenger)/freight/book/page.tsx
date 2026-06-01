"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function FreightBookPage() {
  const router  = useRouter();
  const { data: session } = useSession();
  const [option, setOption]   = useState<any>(null);
  const [search, setSearch]   = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const [form, setForm] = useState({
    recipientName: "", recipientPhone: "", recipientWhatsapp: "",
    recipientEmail: "", recipientAddress: "",
    itemDescription: "", itemCount: 1,
  });

  useEffect(() => {
    const opt = sessionStorage.getItem("freightOption");
    const src = sessionStorage.getItem("freightSearch");
    if (!opt || !src) { router.push("/freight"); return; }
    setOption(JSON.parse(opt));
    setSearch(JSON.parse(src));
  }, []);

  function upd(f: string, v: string | number) { setForm(p => ({ ...p, [f]: v })); }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!option || !search || !session) return;
    setLoading(true); setError("");

    // Build legs with transfer types
    const legs = option.legs.map((leg: any, i: number) => {
      const isFinal = i === option.legs.length - 1;
      const isFirst = i === 0;
      return {
        tripId:       leg.tripId,
        fromStopId:   leg.fromStopId,
        toStopId:     leg.toStopId,
        distanceKm:   leg.distanceKm,
        transferType: isFirst ? "ORIGIN" : isFinal ? "FINAL" : "INTERIM",
        agentId:      isFinal && leg.destinationAgent?.agentId
          ? leg.destinationAgent.agentId
          : (option.transfers[i - 1]?.agentId ?? undefined),
        agentCharge:  isFinal && leg.destinationAgent
          ? (leg.agentCharge ?? 0)
          : (option.transfers[i - 1]?.agentCharge ?? 0),
      };
    });

    // Build items (one item entry per description)
    const items = [{
      description: form.itemDescription || "General cargo",
      weightKg:    Number(search.weight),
      lengthCm:    Number(search.length),
      breadthCm:   Number(search.breadth),
      heightCm:    Number(search.height),
    }];

    const res = await fetch("/api/freight/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromCityId:       search.fromId,
        toCityId:         search.toId,
        shippingDate:     search.date,
        items,
        legs,
        freightCost:      option.freightCost,
        agentCost:        option.agentCost,
        totalCost:        option.totalCost,
        recipientName:    form.recipientName,
        recipientPhone:   form.recipientPhone,
        recipientWhatsapp: form.recipientWhatsapp || undefined,
        recipientEmail:   form.recipientEmail   || undefined,
        recipientAddress: form.recipientAddress,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error ?? "Booking failed"); return; }
    sessionStorage.removeItem("freightOption");
    sessionStorage.removeItem("freightSearch");
    router.push(`/freight/success/${data.bookingRef}`);
  }

  const inputCls = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none";
  const labelCls = "mb-1 block text-sm font-medium text-gray-700";

  if (!option) return <div className="py-12 text-center text-gray-400">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Book Freight</h1>
      <p className="mb-6 text-sm text-gray-500">{search?.fromName} → {search?.toName} · {search?.date}</p>

      {/* Route summary */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
        <div className="font-semibold text-amber-800 mb-2">
          {option.type === "DIRECT" ? "Direct Shipping" : "Via Transfer"} · ₹{option.totalCost.toLocaleString("en-IN")}
        </div>
        {option.legs.map((leg: any, i: number) => (
          <div key={i} className="text-amber-700">
            Bus {i+1}: {leg.fromCityName} → {leg.toCityName} ({leg.busName})
            {option.transfers[i] && (
              <div className="ml-4 text-xs text-amber-600">Transfer at {option.transfers[i].cityName} via {option.transfers[i].agentName}</div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleBook} className="space-y-5">
        {/* Cargo description */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Cargo Details</h2>
          <div>
            <label className={labelCls}>Description of items</label>
            <input className={inputCls} value={form.itemDescription} onChange={e => upd("itemDescription", e.target.value)}
              placeholder="e.g. Electronic equipment, clothing, documents…" />
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
            {search?.weight} kg · {search?.length}×{search?.breadth}×{search?.height} cm
          </div>
        </div>

        {/* Recipient */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Recipient Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Full Name *</label>
              <input required className={inputCls} value={form.recipientName} onChange={e => upd("recipientName", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Phone *</label>
              <input required className={inputCls} value={form.recipientPhone} onChange={e => upd("recipientPhone", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>WhatsApp</label>
              <input className={inputCls} value={form.recipientWhatsapp} onChange={e => upd("recipientWhatsapp", e.target.value)} placeholder="If different from phone" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={form.recipientEmail} onChange={e => upd("recipientEmail", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Pickup Address *</label>
            <textarea required rows={2} className={inputCls} value={form.recipientAddress} onChange={e => upd("recipientAddress", e.target.value)}
              placeholder="Address where recipient will collect the freight" />
          </div>
        </div>

        {/* Cost summary */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Cost Summary</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>Freight charge</span><span>₹{option.freightCost.toLocaleString("en-IN")}</span></div>
            {option.agentCost > 0 && <div className="flex justify-between text-gray-600"><span>Agent handling</span><span>₹{option.agentCost.toLocaleString("en-IN")}</span></div>}
          </div>
          <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 font-bold text-gray-900">
            <span>Total</span><span className="text-amber-600">₹{option.totalCost.toLocaleString("en-IN")}</span>
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
          📱 The recipient will receive a QR code to collect the freight from the agent at the destination. Both sender and recipient must be app members to track status.
        </div>

        {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

        <button type="submit" disabled={loading}
          className="w-full rounded-xl bg-amber-500 py-3 text-base font-bold text-white hover:bg-amber-600 disabled:opacity-50">
          {loading ? "Confirming booking…" : `Confirm & Pay ₹${option.totalCost.toLocaleString("en-IN")}`}
        </button>
      </form>
    </div>
  );
}
