"use client";

import { useEffect, useState } from "react";

export default function AgentBookedPassengersPage() {
  const [passengers, setPassengers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users/agent-booked")
      .then(r => r.json())
      .then(d => { setPassengers(d.passengers ?? []); setLoading(false); });
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Passengers Booked via Agent</h1>
        <p className="mt-1 text-sm text-gray-400">Passengers whose bookings were created by an agent on their behalf.</p>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : passengers.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No agent-booked passengers found.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-900 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-3">Passenger Name</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Booked By Agent</th>
                <th className="px-5 py-3">No. of Bookings</th>
                <th className="px-5 py-3">Last Booking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {passengers.map((p: any) => (
                <tr key={p.userId} className="hover:bg-gray-700/30">
                  <td className="px-5 py-4 font-medium text-white">{p.name ?? "—"}</td>
                  <td className="px-5 py-4 text-gray-300">{p.phone ?? "—"}</td>
                  <td className="px-5 py-4 text-gray-300">{p.email ?? "—"}</td>
                  <td className="px-5 py-4 text-gray-300">{p.agentName}</td>
                  <td className="px-5 py-4 text-gray-300">{p.bookingCount}</td>
                  <td className="px-5 py-4 text-gray-400 text-xs">
                    {new Date(p.lastBookingDate).toLocaleDateString("en-IN")}
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
