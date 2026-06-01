"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

const STATUS_STYLE: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-600",
};

export default function ShuttleBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/shuttle/bookings").then(r => r.json()).then(d => {
      setBookings(d.bookings ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        <p className="text-sm text-gray-500 mt-1">Shuttle pickup and drop-off bookings assigned to you.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No bookings assigned yet.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Address</th>
                <th className="px-5 py-3">Scheduled</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${b.type === "PICKUP" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                      {b.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{b.address}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {b.scheduledAt ? format(new Date(b.scheduledAt), "d MMM yyyy HH:mm") : "TBD"}
                  </td>
                  <td className="px-5 py-3 font-semibold text-green-700">₹{Number(b.price).toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[b.status] ?? ""}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
