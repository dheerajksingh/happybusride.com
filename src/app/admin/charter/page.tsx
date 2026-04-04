"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

const statusVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  PENDING_DEPOSIT: "warning",
  CONFIRMED: "success",
  COMPLETED: "info",
  CANCELLED_PASSENGER: "danger",
  CANCELLED_OPERATOR: "danger",
};

const ALL_STATUSES = ["PENDING_DEPOSIT", "CONFIRMED", "COMPLETED", "CANCELLED_PASSENGER", "CANCELLED_OPERATOR"];

interface AdminCharterBooking {
  id: string;
  pnr: string;
  status: string;
  startDate: string;
  endDate: string;
  numDays: number;
  depositAmount: string;
  totalAmount: string;
  createdAt: string;
  user: { name: string | null; phone: string | null } | null;
  bus: {
    name: string;
    busType: string;
    operator: { companyName: string } | null;
  } | null;
  payment: { status: string; method: string | null } | null;
}

export default function AdminCharterPage() {
  const [bookings, setBookings] = useState<AdminCharterBooking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (search.trim()) params.set("q", search.trim());

    setLoading(true);
    fetch(`/api/admin/charter?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setBookings(d.bookings ?? []);
        setTotal(d.total ?? 0);
        setLoading(false);
      });
  }, [statusFilter, search]);

  const filtered = useMemo(() => bookings, [bookings]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Charter Bookings ({total})
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">All operators · All time</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PNR or passenger…"
            className="w-56 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-3">PNR</th>
                <th className="px-4 py-3">Passenger</th>
                <th className="px-4 py-3">Bus / Operator</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Deposit</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No charter bookings match your filters.
                  </td>
                </tr>
              )}
              {filtered.map((b) => (
                <tr key={b.id} className="border-b border-gray-700 hover:bg-gray-750">
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{b.pnr.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3">
                    <p className="text-white">{b.user?.name ?? "—"}</p>
                    <p className="text-xs text-gray-400">{b.user?.phone ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white">{b.bus?.name ?? "—"}</p>
                    <p className="text-xs text-gray-400">{b.bus?.operator?.companyName ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs">
                    <p>{new Date(b.startDate).toLocaleDateString("en-IN")} – {new Date(b.endDate).toLocaleDateString("en-IN")}</p>
                    <p className="text-gray-500">{b.numDays} day{b.numDays !== 1 ? "s" : ""}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300">₹{Number(b.depositAmount).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 font-medium text-white">₹{Number(b.totalAmount).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[b.status] ?? "default"}>
                      {b.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 text-right">
        <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-300">← Back to Dashboard</Link>
      </div>
    </div>
  );
}
