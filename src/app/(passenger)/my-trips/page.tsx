"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { PageSpinner } from "@/components/ui/Spinner";
import { bookingStatusBadge } from "@/components/ui/Badge";
import { BUS_TYPE_LABELS } from "@/constants/config";

interface Booking {
  id: string;
  pnr: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  seats: { seat: { seatNumber: string } }[];
  trip: {
    travelDate: string;
    schedule: {
      departureTime: string;
      route: {
        fromCity: { name: string };
        toCity: { name: string };
      };
      bus: { name: string; busType: string };
    };
  };
  payment: { status: string; method: string } | null;
}

interface CharterBooking {
  id: string;
  pnr: string;
  status: string;
  totalAmount: number;
  depositAmount: number;
  startDate: string;
  endDate: string;
  numDays: number;
  createdAt: string;
  bus: {
    name: string;
    busType: string;
    operator: { companyName: string };
  };
  payment: { status: string; method: string } | null;
}

const CHARTER_STATUS_COLORS: Record<string, string> = {
  PENDING_DEPOSIT: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-green-100 text-green-700",
  CANCELLED_PASSENGER: "bg-red-100 text-red-700",
  CANCELLED_OPERATOR: "bg-red-100 text-red-700",
  COMPLETED: "bg-gray-100 text-gray-600",
};

const CHARTER_STATUS_LABELS: Record<string, string> = {
  PENDING_DEPOSIT: "Pending Deposit",
  CONFIRMED: "Confirmed",
  CANCELLED_PASSENGER: "Cancelled",
  CANCELLED_OPERATOR: "Cancelled by Operator",
  COMPLETED: "Completed",
};

type Tab = "bookings" | "charter";

export default function MyTripsPage() {
  const [tab, setTab] = useState<Tab>("bookings");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [charterBookings, setCharterBookings] = useState<CharterBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (tab === "bookings") {
      fetch("/api/bookings")
        .then((r) => r.json())
        .then((d) => setBookings(d.bookings ?? []))
        .finally(() => setLoading(false));
    } else {
      fetch("/api/charter/bookings")
        .then((r) => r.json())
        .then((d) => setCharterBookings(d.bookings ?? []))
        .finally(() => setLoading(false));
    }
  }, [tab]);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-gray-900">My Trips</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        <button
          onClick={() => setTab("bookings")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "bookings" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Bus Tickets
        </button>
        <button
          onClick={() => setTab("charter")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "charter" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Charter
        </button>
      </div>

      {loading ? (
        <PageSpinner />
      ) : tab === "bookings" ? (
        bookings.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <p className="text-4xl mb-4">🎫</p>
            <h3 className="text-lg font-semibold text-gray-900">No bookings yet</h3>
            <p className="mt-1 text-sm text-gray-500">Book your first bus ticket to get started.</p>
            <Link href="/" className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Search Buses
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const dep = new Date(b.trip.schedule.departureTime);
              const seatNums = b.seats.map((s) => s.seat.seatNumber).join(", ");
              return (
                <Link
                  key={b.id}
                  href={`/my-trips/${b.id}`}
                  className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-bold text-gray-900">
                          {b.trip.schedule.route.fromCity.name} → {b.trip.schedule.route.toCity.name}
                        </span>
                        {bookingStatusBadge(b.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {format(dep, "EEE, d MMM yyyy")} · {format(dep, "HH:mm")}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {b.trip.schedule.bus.name} · {BUS_TYPE_LABELS[b.trip.schedule.bus.busType]} · Seats: {seatNums}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">₹{Number(b.totalAmount).toLocaleString()}</p>
                      <p className="text-xs text-gray-400">PNR: {b.pnr.slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : charterBookings.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="text-4xl mb-4">🚌</p>
          <h3 className="text-lg font-semibold text-gray-900">No charter bookings yet</h3>
          <p className="mt-1 text-sm text-gray-500">Book a charter bus for your next big journey.</p>
          <Link href="/charter" className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Browse Charter Buses
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {charterBookings.map((b) => {
            const statusColor = CHARTER_STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-600";
            const statusLabel = CHARTER_STATUS_LABELS[b.status] ?? b.status;
            return (
              <Link
                key={b.id}
                href={`/charter/confirmation/${b.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-bold text-gray-900">{b.bus.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {format(new Date(b.startDate), "d MMM")} – {format(new Date(b.endDate), "d MMM yyyy")} · {b.numDays} day{b.numDays > 1 ? "s" : ""}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {b.bus.operator.companyName} · {BUS_TYPE_LABELS[b.bus.busType]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">₹{Number(b.totalAmount).toLocaleString()}</p>
                    <p className="text-xs text-green-600">Deposit: ₹{Number(b.depositAmount).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">PNR: {b.pnr.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
