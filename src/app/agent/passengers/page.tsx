"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function AgentPassengersPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agent/bookings").then(r => r.json()).then(d => { setBookings(d.bookings ?? []); setLoading(false); });
  }, []);

  if (loading) return <div className="py-12 text-center text-gray-400">Loading…</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Passenger Bookings</h1>
          <p className="text-sm text-gray-500">Seat bookings you have made on behalf of passengers</p>
        </div>
        <button
          onClick={() => router.push("/agent/bulk-booking")}
          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600"
        >
          + Book Passenger Ticket
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-xl bg-white border border-gray-200 p-12 text-center shadow-sm">
          <div className="mb-3 text-4xl">👥</div>
          <h3 className="font-semibold text-gray-900">No bookings yet</h3>
          <p className="mt-1 text-sm text-gray-500">Passenger bookings you make on behalf of clients will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-3">PNR</th>
                <th className="px-5 py-3">Route</th>
                <th className="px-5 py-3">Travel Date</th>
                <th className="px-5 py-3">Passengers</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Commission</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map(ab => {
                const b = ab.booking;
                const route = b.trip?.schedule?.route;
                return (
                  <tr key={ab.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{b.pnr?.slice(0,10).toUpperCase()}</td>
                    <td className="px-5 py-3 font-medium">{route?.fromCity?.name} → {route?.toCity?.name}</td>
                    <td className="px-5 py-3 text-gray-500">{format(new Date(b.trip?.travelDate), "d MMM yyyy")}</td>
                    <td className="px-5 py-3">{b.passengers?.length ?? 0}</td>
                    <td className="px-5 py-3 font-semibold">₹{Number(b.payment?.amount ?? 0).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3 text-green-700 font-semibold">₹{Number(ab.commission).toLocaleString("en-IN")}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${b.status === "CONFIRMED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {b.status}
                      </span>
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
