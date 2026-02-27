"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";

const statusVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  PENDING: "warning",
  CONFIRMED: "success",
  COMPLETED: "success",
  CANCELLED: "danger",
  CANCELLED_USER: "danger",
  REFUNDED: "info",
};

const ALL_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "CANCELLED_USER", "REFUNDED"];

interface AdminBooking {
  id: string;
  pnr: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  user: { name: string | null; phone: string | null } | null;
  trip: {
    travelDate: string;
    schedule: {
      route: {
        fromCity: { name: string };
        toCity: { name: string };
      };
    };
  } | null;
  _count: { seats: number };
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetch("/api/admin/bookings")
      .then((r) => r.json())
      .then((d) => {
        setBookings(d);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return bookings.filter((b) => {
      const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
      const matchesSearch =
        !q ||
        b.pnr.toLowerCase().includes(q) ||
        b.user?.name?.toLowerCase().includes(q) ||
        b.user?.phone?.includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [bookings, search, statusFilter]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-white">
          Bookings ({filtered.length}{(search || statusFilter !== "ALL") ? ` of ${bookings.length}` : ""})
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PNR or passenger…"
            className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-56"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-3">PNR</th>
                <th className="px-4 py-3">Passenger</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Seats</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No bookings match your filters.
                  </td>
                </tr>
              )}
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-gray-700 hover:bg-gray-750">
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{b.pnr}</td>
                  <td className="px-4 py-3">
                    <p className="text-white">{b.user?.name ?? "—"}</p>
                    <p className="text-xs text-gray-400">{b.user?.phone ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {b.trip?.schedule?.route?.fromCity?.name} → {b.trip?.schedule?.route?.toCity?.name}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs">
                    {new Date(b.trip?.travelDate ?? b.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{b._count.seats}</td>
                  <td className="px-4 py-3 font-medium text-white">₹{Number(b.totalAmount).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[b.status] ?? "default"}>{b.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
