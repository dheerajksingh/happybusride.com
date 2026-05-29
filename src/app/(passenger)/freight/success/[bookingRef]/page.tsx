import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { notFound } from "next/navigation";

export default async function FreightSuccessPage({ params }: { params: Promise<{ bookingRef: string }> }) {
  const { bookingRef } = await params;

  const booking = await prisma.freightBooking.findFirst({
    where: { bookingRef },
    include: {
      fromCity: { select: { name: true } },
      toCity:   { select: { name: true } },
      items:    true,
      legs: {
        orderBy: { legOrder: "asc" },
        include: {
          stop:   { include: { city: { select: { name: true } } } },
          toStop: { include: { city: { select: { name: true } } } },
          agent:  { select: { fullName: true, phone: true } },
        },
      },
    },
  });

  if (!booking) return notFound();

  const finalLeg   = booking.legs[booking.legs.length - 1];
  const finalAgent = finalLeg?.agent;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 text-center">
      <div className="mb-4 text-5xl">✅</div>
      <h1 className="text-2xl font-black text-gray-900 mb-1">Freight Booked!</h1>
      <p className="text-gray-500 mb-6">Your cargo is on its way</p>

      {/* Ticket card */}
      <div className="rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 p-6 mb-6 text-left">
        <div className="text-xs text-amber-600 font-semibold mb-1">BOOKING REF</div>
        <div className="text-2xl font-black tracking-widest text-amber-700 mb-4">
          {booking.bookingRef.slice(0, 12).toUpperCase()}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
          {[
            ["From",    booking.fromCity.name],
            ["To",      booking.toCity.name],
            ["Date",    format(new Date(booking.shippingDate), "d MMM yyyy")],
            ["Items",   `${booking.items.length} item(s)`],
            ["Recipient", booking.recipientName],
            ["Phone",   booking.recipientPhone],
          ].map(([k, v]) => (
            <div key={k as string}>
              <div className="text-xs text-gray-400">{k}</div>
              <div className="font-semibold text-gray-800">{v}</div>
            </div>
          ))}
        </div>

        <div className="border-t border-amber-200 pt-3">
          <div className="text-xs text-gray-400 mb-2">Shipping Chain</div>
          {booking.legs.map((leg, i) => (
            <div key={leg.id} className="text-xs text-gray-600 mb-1">
              {i + 1}. {leg.stop.city.name} → {leg.toStop?.city.name ?? "Final stop"}
              {leg.agent && <span className="text-amber-600"> (Agent: {leg.agent.fullName})</span>}
            </div>
          ))}
        </div>

        {finalAgent && (
          <div className="mt-3 rounded-lg bg-white border border-amber-200 p-3">
            <div className="text-xs text-gray-400 mb-1">Receiving Agent at Destination</div>
            <div className="font-semibold text-gray-800">{finalAgent.fullName}</div>
            <div className="text-sm text-gray-500">{finalAgent.phone}</div>
          </div>
        )}

        <div className="mt-3 flex justify-between text-sm font-bold text-gray-900 border-t border-amber-200 pt-3">
          <span>Total Paid</span>
          <span className="text-amber-600">₹{Number(booking.totalCost).toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700 mb-6 text-left">
        📱 <strong>Recipient tracking QR</strong> has been noted. Share the booking reference <strong>{booking.bookingRef.slice(0,12).toUpperCase()}</strong> with the recipient to track at <Link href={`/freight/track/${booking.bookingRef}`} className="underline">/freight/track</Link>.
      </div>

      <div className="flex gap-3 justify-center">
        <Link href={`/freight/track/${booking.bookingRef}`}
          className="rounded-xl border border-amber-400 bg-white px-5 py-2 text-sm font-semibold text-amber-600 hover:bg-amber-50">
          Track Freight
        </Link>
        <Link href="/freight"
          className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600">
          Ship Another
        </Link>
      </div>
    </div>
  );
}
