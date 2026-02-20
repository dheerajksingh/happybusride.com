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

export default function MyTripsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <PageSpinner />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Trips</h1>

      {bookings.length === 0 ? (
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
      )}
    </div>
  );
}
