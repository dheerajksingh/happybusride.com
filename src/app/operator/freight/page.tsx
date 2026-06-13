"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";

const STATUS_STYLE: Record<string, string> = {
  PENDING_PAYMENT: "bg-gray-100 text-gray-600",
  CONFIRMED:       "bg-blue-100 text-blue-700",
  IN_TRANSIT:      "bg-amber-100 text-amber-700",
  AT_AGENT:        "bg-purple-100 text-purple-700",
  AT_DESTINATION:  "bg-indigo-100 text-indigo-700",
  DELIVERED:       "bg-green-100 text-green-700",
  CANCELLED:       "bg-red-100 text-red-600",
};

const LEG_STATUS_STYLE: Record<string, string> = {
  PENDING:        "bg-gray-100 text-gray-600",
  AGENT_RECEIVED: "bg-blue-100 text-blue-700",
  LOADED:         "bg-amber-100 text-amber-700",
  IN_TRANSIT:     "bg-orange-100 text-orange-700",
  AGENT_AT_NEXT:  "bg-purple-100 text-purple-700",
  COLLECTED:      "bg-green-100 text-green-700",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-36 shrink-0 text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value ?? "—"}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-1.5">{children}</div>
    </div>
  );
}

export default function OperatorFreightPage() {
  const [freights, setFreights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "in_transit">("upcoming");

  useEffect(() => {
    fetch("/api/operator/freight")
      .then(r => r.json())
      .then(d => { setFreights(d.freights ?? []); setLoading(false); });
  }, []);

  const filtered = freights.filter(f => {
    if (filter === "upcoming") return ["PENDING", "AGENT_RECEIVED"].includes(f.status);
    if (filter === "in_transit") return ["LOADED", "IN_TRANSIT", "AGENT_AT_NEXT"].includes(f.status);
    return true;
  });

  if (loading) return <div className="py-12 text-center text-gray-400">Loading…</div>;

  return (
    <div className="flex gap-6 h-full">
      {/* Left — list */}
      <div className="w-96 shrink-0 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Freight</h1>
          <p className="text-sm text-gray-500">Cargo on your buses</p>
        </div>

        {/* Filter tabs */}
        <div className="mb-3 flex gap-1 rounded-xl bg-gray-100 p-1">
          {([
            { key: "upcoming",   label: "Upcoming" },
            { key: "in_transit", label: "In Transit" },
            { key: "all",        label: "All" },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${filter === f.key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="rounded-xl bg-white border border-gray-200 p-8 text-center">
              <div className="text-3xl mb-2">📦</div>
              <p className="text-sm text-gray-500">No freight for this filter</p>
            </div>
          ) : filtered.map((f: any) => (
            <div key={f.id}
              onClick={() => setSelected(f)}
              className={`cursor-pointer rounded-xl border p-3 transition-all hover:shadow-sm ${selected?.id === f.id ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"}`}>
              <div className="flex items-start justify-between mb-1">
                <div className="font-medium text-gray-900 text-sm">
                  {f.fromStop?.city?.name} → {f.toStop?.city?.name}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEG_STATUS_STYLE[f.status]}`}>
                  {f.status?.replace(/_/g, " ")}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {f.booking?.fromCity?.name} → {f.booking?.toCity?.name}
              </div>
              <div className="mt-1 text-xs text-gray-400">
                Bus: {f.trip?.schedule?.bus?.name} · {f.trip?.travelDate ? format(new Date(f.trip.travelDate), "d MMM") : "—"}
              </div>
              <div className="text-xs text-gray-400 font-mono">
                {f.booking?.bookingRef?.slice(0, 12).toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — detail */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm">Select a freight entry to view details</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">Freight Details</h2>
              <div className="flex gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[selected.booking?.status]}`}>
                  {selected.booking?.status?.replace(/_/g, " ")}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEG_STATUS_STYLE[selected.status]}`}>
                  Leg: {selected.status?.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            <Section title="Freight">
              <Row label="Booking Ref" value={<span className="font-mono text-xs">{selected.booking?.bookingRef?.slice(0, 14).toUpperCase()}</span>} />
              <Row label="Leg Type" value={selected.transferType} />
              <Row label="Shipping Date" value={selected.booking?.shippingDate ? format(new Date(selected.booking.shippingDate), "d MMM yyyy") : "—"} />
              <Row label="Origin" value={`${selected.booking?.fromCity?.name} → ${selected.booking?.toCity?.name}`} />
              <Row label="This Leg" value={`${selected.fromStop?.city?.name} → ${selected.toStop?.city?.name}`} />
              <Row label="Freight Cost" value={`₹${Number(selected.booking?.freightCost ?? 0).toLocaleString("en-IN")}`} />
              <Row label="Total Cost" value={`₹${Number(selected.booking?.totalCost ?? 0).toLocaleString("en-IN")}`} />
            </Section>

            <Section title="Items">
              {selected.booking?.items?.length > 0 ? selected.booking.items.map((item: any, i: number) => (
                <div key={i} className="text-sm text-gray-700">
                  {item.description || "General cargo"} — <strong>{item.weightKg}kg</strong> · {item.lengthCm}×{item.breadthCm}×{item.heightCm}cm
                </div>
              )) : <span className="text-sm text-gray-400">No item details</span>}
            </Section>

            <Section title="Bus">
              <Row label="Bus" value={selected.trip?.schedule?.bus?.name} />
              <Row label="Reg No" value={selected.trip?.schedule?.bus?.registrationNo} />
              <Row label="Type" value={selected.trip?.schedule?.bus?.busType?.replace(/_/g, " ")} />
              <Row label="Route" value={`${selected.trip?.schedule?.route?.fromCity?.name} → ${selected.trip?.schedule?.route?.toCity?.name}`} />
              <Row label="Travel Date" value={selected.trip?.travelDate ? format(new Date(selected.trip.travelDate), "d MMM yyyy") : "—"} />
            </Section>

            <Section title="Sender">
              <Row label="Name" value={selected.booking?.sender?.name} />
              <Row label="Phone" value={selected.booking?.sender?.phone} />
              <Row label="Email" value={selected.booking?.sender?.email} />
            </Section>

            <Section title="Recipient">
              <Row label="Name" value={selected.booking?.recipientName} />
              <Row label="Phone" value={selected.booking?.recipientPhone} />
              <Row label="WhatsApp" value={selected.booking?.recipientWhatsapp} />
              <Row label="Address" value={selected.booking?.recipientAddress} />
            </Section>

            {selected.agent && (
              <Section title="Handling Agent">
                <Row label="Name" value={selected.agent?.fullName} />
                <Row label="Phone" value={selected.agent?.phone} />
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
