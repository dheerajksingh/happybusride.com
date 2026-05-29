"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

const LEG_STATUS_LABEL: Record<string, string> = {
  PENDING:       "Waiting",
  AGENT_RECEIVED:"Agent received",
  LOADED:        "Loaded on bus",
  IN_TRANSIT:    "In transit",
  AGENT_AT_NEXT: "At next agent",
  COLLECTED:     "Collected",
};

const LEG_STATUS_COLOR: Record<string, string> = {
  PENDING:       "bg-gray-100 text-gray-500",
  AGENT_RECEIVED:"bg-blue-100 text-blue-700",
  LOADED:        "bg-amber-100 text-amber-700",
  IN_TRANSIT:    "bg-purple-100 text-purple-700",
  AGENT_AT_NEXT: "bg-indigo-100 text-indigo-700",
  COLLECTED:     "bg-green-100 text-green-700",
};

const BOOKING_STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT:"bg-gray-100 text-gray-600",
  CONFIRMED:      "bg-blue-100 text-blue-700",
  IN_TRANSIT:     "bg-amber-100 text-amber-700",
  AT_AGENT:       "bg-purple-100 text-purple-700",
  AT_DESTINATION: "bg-indigo-100 text-indigo-700",
  DELIVERED:      "bg-green-100 text-green-700",
  CANCELLED:      "bg-red-100 text-red-600",
};

export default function FreightTrackPage() {
  const { bookingRef } = useParams<{ bookingRef: string }>();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/freight/track/${bookingRef}`)
      .then(r => r.json())
      .then(d => { setBooking(d.booking); setLoading(false); });
  }, [bookingRef]);

  if (loading) return <div className="py-12 text-center text-gray-400">Loading…</div>;
  if (!booking) return (
    <div className="mx-auto max-w-md px-4 py-10 text-center">
      <div className="text-4xl mb-3">🔍</div>
      <h2 className="font-bold text-gray-900">Booking not found</h2>
      <Link href="/freight" className="mt-4 inline-block text-sm text-amber-600 hover:underline">Search freight →</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-4">
        <Link href="/freight" className="text-sm text-amber-600 hover:underline">← Ship freight</Link>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Freight Tracking</h1>
          <p className="text-sm text-gray-500 font-mono">{booking.bookingRef.slice(0,12).toUpperCase()}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${BOOKING_STATUS_COLOR[booking.status]}`}>
          {booking.status.replace(/_/g, " ")}
        </span>
      </div>

      {/* Route summary */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 text-sm">
        <div className="flex justify-between mb-2">
          <span className="font-bold text-gray-900">{booking.fromCity.name} → {booking.toCity.name}</span>
          <span className="text-gray-400">{format(new Date(booking.shippingDate), "d MMM yyyy")}</span>
        </div>
        <div className="text-gray-500">
          {booking.items.length} item(s) · Recipient: {booking.recipientName} ({booking.recipientPhone})
        </div>
      </div>

      {/* Leg-by-leg tracking */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-6">
        <div className="border-b border-gray-100 px-4 py-3 font-semibold text-gray-900 text-sm">Journey Progress</div>
        <div className="divide-y divide-gray-50">
          {booking.legs.map((leg: any, i: number) => (
            <div key={leg.id} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium text-gray-800">
                  {leg.stop?.city?.name} → {leg.toStop?.city?.name ?? "Destination"}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEG_STATUS_COLOR[leg.status]}`}>
                  {LEG_STATUS_LABEL[leg.status]}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {leg.transferType === "ORIGIN" ? "Pickup" : leg.transferType === "FINAL" ? "Final stop" : "Transfer stop"}
                {leg.agent && <span> · Agent: {leg.agent.fullName} {leg.agent.phone}</span>}
              </div>
              {leg.receivedAt && <div className="text-xs text-green-600 mt-0.5">Received: {format(new Date(leg.receivedAt), "d MMM HH:mm")}</div>}
              {leg.loadedAt   && <div className="text-xs text-amber-600 mt-0.5">Loaded: {format(new Date(leg.loadedAt), "d MMM HH:mm")}</div>}
              {leg.releasedAt && <div className="text-xs text-purple-600 mt-0.5">Released: {format(new Date(leg.releasedAt), "d MMM HH:mm")}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="text-center text-xs text-gray-400">
        Share ref <strong>{booking.bookingRef.slice(0,12).toUpperCase()}</strong> with recipient to track pickup
      </div>
    </div>
  );
}
