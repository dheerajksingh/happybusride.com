"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
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
  PENDING:         "bg-gray-100 text-gray-600",
  AGENT_RECEIVED:  "bg-blue-100 text-blue-700",
  LOADED:          "bg-amber-100 text-amber-700",
  IN_TRANSIT:      "bg-orange-100 text-orange-700",
  AGENT_AT_NEXT:   "bg-purple-100 text-purple-700",
  COLLECTED:       "bg-green-100 text-green-700",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs font-semibold uppercase text-gray-400">{title}</p>
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value ?? "—"}</span>
    </div>
  );
}

function FreightDetailPanel({ booking, onClose, onStatusUpdate }: { booking: any; onClose: () => void; onStatusUpdate: () => void }) {
  const [updating, setUpdating] = useState<string | null>(null);

  async function updateLegStatus(legId: string, action: string) {
    setUpdating(legId);
    const res = await fetch(`/api/agent/freight/${legId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setUpdating(null);
    if (res.ok) onStatusUpdate();
    else { const d = await res.json(); alert(d.error ?? "Failed"); }
  }

  const isBooked = !booking.transferType; // booking object vs leg object

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-3">
          <h2 className="font-bold text-gray-900">Freight Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
        </div>

        <div className="p-5">
          {/* Freight details */}
          <Section title="Freight">
            <Row label="Ref" value={<span className="font-mono text-xs">{(isBooked ? booking.bookingRef : booking.booking?.bookingRef)?.slice(0, 14).toUpperCase()}</span>} />
            <Row label="Status" value={
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[isBooked ? booking.status : booking.booking?.status]}`}>
                {(isBooked ? booking.status : booking.booking?.status)?.replace(/_/g, " ")}
              </span>
            } />
            <Row label="Shipping Date" value={format(new Date(isBooked ? booking.shippingDate : booking.booking?.shippingDate), "d MMM yyyy")} />
            <Row label="Route" value={`${isBooked ? booking.fromCity?.name : booking.booking?.fromCity?.name} → ${isBooked ? booking.toCity?.name : booking.booking?.toCity?.name}`} />
            <Row label="Freight Cost" value={`₹${Number(isBooked ? booking.freightCost : booking.booking?.freightCost).toLocaleString("en-IN")}`} />
            <Row label="Total Cost" value={`₹${Number(isBooked ? booking.totalCost : booking.booking?.totalCost).toLocaleString("en-IN")}`} />
          </Section>

          {/* Items */}
          <Section title="Items">
            {(isBooked ? booking.items : booking.booking?.items)?.map((item: any, i: number) => (
              <div key={i} className="text-gray-700">
                {item.description || "General cargo"} — {item.weightKg}kg · {item.lengthCm}×{item.breadthCm}×{item.heightCm}cm
              </div>
            ))}
          </Section>

          {/* Bus details */}
          {!isBooked && booking.trip?.schedule && (
            <Section title="Bus">
              <Row label="Bus" value={booking.trip.schedule.bus?.name} />
              <Row label="Reg No" value={booking.trip.schedule.bus?.registrationNo} />
              <Row label="Type" value={booking.trip.schedule.bus?.busType?.replace(/_/g, " ")} />
              <Row label="Route" value={`${booking.trip.schedule.route?.fromCity?.name} → ${booking.trip.schedule.route?.toCity?.name}`} />
              <Row label="Travel Date" value={format(new Date(booking.trip.travelDate), "d MMM yyyy")} />
              <Row label="My Stop" value={booking.stop?.city?.name ?? booking.fromStop?.city?.name} />
            </Section>
          )}

          {isBooked && booking.legs?.[0]?.trip?.schedule && (
            <Section title="Bus">
              <Row label="Bus" value={booking.legs[0].trip.schedule.bus?.name} />
              <Row label="Reg No" value={booking.legs[0].trip.schedule.bus?.registrationNo} />
              <Row label="Type" value={booking.legs[0].trip.schedule.bus?.busType?.replace(/_/g, " ")} />
              <Row label="Route" value={`${booking.legs[0].trip.schedule.route?.fromCity?.name} → ${booking.legs[0].trip.schedule.route?.toCity?.name}`} />
              <Row label="Travel Date" value={format(new Date(booking.legs[0].trip.travelDate), "d MMM yyyy")} />
            </Section>
          )}

          {/* Sender */}
          <Section title="Sender">
            <Row label="Name" value={isBooked ? booking.sender?.name : booking.booking?.sender?.name} />
            <Row label="Phone" value={isBooked ? booking.sender?.phone : booking.booking?.sender?.phone} />
            <Row label="Email" value={isBooked ? booking.sender?.email : booking.booking?.sender?.email} />
          </Section>

          {/* Recipient */}
          <Section title="Recipient">
            <Row label="Name" value={isBooked ? booking.recipientName : booking.booking?.recipientName} />
            <Row label="Phone" value={isBooked ? booking.recipientPhone : booking.booking?.recipientPhone} />
            <Row label="WhatsApp" value={isBooked ? booking.recipientWhatsapp : booking.booking?.recipientWhatsapp} />
            <Row label="Address" value={isBooked ? booking.recipientAddress : booking.booking?.recipientAddress} />
          </Section>

          {/* Leg status actions (handling only) */}
          {!isBooked && (
            <Section title="Status Update">
              <Row label="Leg Status" value={
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEG_STATUS_STYLE[booking.status]}`}>
                  {booking.status?.replace(/_/g, " ")}
                </span>
              } />
              <div className="mt-2 flex flex-wrap gap-2">
                {booking.status === "PENDING" && (
                  <button onClick={() => updateLegStatus(booking.id, "AGENT_RECEIVED")} disabled={updating === booking.id}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {updating === booking.id ? "…" : "Mark Received"}
                  </button>
                )}
                {booking.status === "AGENT_RECEIVED" && booking.transferType !== "FINAL" && (
                  <button onClick={() => updateLegStatus(booking.id, "LOADED")} disabled={updating === booking.id}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                    {updating === booking.id ? "…" : "Mark Loaded to Bus"}
                  </button>
                )}
                {booking.status === "AGENT_RECEIVED" && booking.transferType === "FINAL" && (
                  <button onClick={() => updateLegStatus(booking.id, "COLLECTED")} disabled={updating === booking.id}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                    {updating === booking.id ? "…" : "Mark Collected by Recipient"}
                  </button>
                )}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentFreightPage() {
  const [data, setData] = useState<{ booked: any[]; handling: any[] }>({ booked: [], handling: [] });
  const [tab, setTab] = useState<"booked" | "handling">("handling");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  function loadData() {
    fetch("/api/agent/freight").then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }

  useEffect(() => { loadData(); }, []);

  const list = tab === "booked" ? data.booked : data.handling;

  if (loading) return <div className="py-12 text-center text-gray-400">Loading…</div>;

  return (
    <div>
      {selected && (
        <FreightDetailPanel
          booking={selected}
          onClose={() => setSelected(null)}
          onStatusUpdate={() => { loadData(); setSelected(null); }}
        />
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Freight</h1>
          <p className="text-sm text-gray-500">Manage cargo you are handling or have booked on behalf of clients</p>
        </div>
        <Link href="/agent/freight/book-walkin"
          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600">
          + Book for Walk-in Customer
        </Link>
      </div>

      <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(["handling", "booked"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${tab === t ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            {t === "handling" ? `📦 Handling (${data.handling.length})` : `🧾 Booked (${data.booked.length})`}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-xl bg-white border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="font-semibold text-gray-900">No freight</h3>
          <p className="text-sm text-gray-500 mt-1">{tab === "handling" ? "Freight assigned to you will appear here." : "Bookings you made for clients appear here."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-400">
                <th className="px-4 py-3 text-left">Ref</th>
                <th className="px-4 py-3 text-left">Route</th>
                <th className="px-4 py-3 text-left">Date</th>
                {tab === "booked" && <th className="px-4 py-3 text-left">Recipient</th>}
                {tab === "handling" && <th className="px-4 py-3 text-left">My Stop</th>}
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map((item: any) => {
                const isBooked = tab === "booked";
                const b = isBooked ? item : item.booking;
                const ref   = b?.bookingRef?.slice(0, 12).toUpperCase();
                const from  = b?.fromCity?.name;
                const to    = b?.toCity?.name;
                const date  = b?.shippingDate;
                const status = isBooked ? b?.status : item.status;
                const total = isBooked ? b?.totalCost : b?.totalCost;

                return (
                  <tr key={item.id} className="hover:bg-orange-50 cursor-pointer"
                    onClick={() => setSelected(item)}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{ref}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{from} → {to}</td>
                    <td className="px-4 py-3 text-gray-500">{date ? format(new Date(date), "d MMM") : "—"}</td>
                    {isBooked && <td className="px-4 py-3 text-gray-600">{b?.recipientName}</td>}
                    {!isBooked && <td className="px-4 py-3 text-gray-600">{item.stop?.city?.name ?? item.fromStop?.city?.name ?? "—"}</td>}
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[status] ?? "bg-gray-100 text-gray-500"}`}>
                        {status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {total ? `₹${Number(total).toLocaleString("en-IN")}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
