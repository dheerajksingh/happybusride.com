"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { PageSpinner } from "@/components/ui/Spinner";
import { BUS_TYPE_LABELS } from "@/constants/config";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING_DEPOSIT: { label: "Pending Deposit", color: "bg-yellow-100 text-yellow-700" },
  CONFIRMED: { label: "Confirmed", color: "bg-green-100 text-green-700" },
  CANCELLED_PASSENGER: { label: "Cancelled", color: "bg-red-100 text-red-700" },
  CANCELLED_OPERATOR: { label: "Cancelled by Operator", color: "bg-red-100 text-red-700" },
  COMPLETED: { label: "Completed", color: "bg-gray-100 text-gray-700" },
};

interface CharterBookingDetail {
  id: string;
  pnr: string;
  status: string;
  startDate: string;
  endDate: string;
  numDays: number;
  estimatedKm: number;
  totalAmount: number;
  depositAmount: number;
  depositPercent: number;
  pickupAddress: string | null;
  dropAddress: string | null;
  purpose: string | null;
  passengerCount: number;
  bus: {
    name: string;
    busType: string;
    totalSeats: number;
    operator: { companyName: string };
  };
  payment: { status: string; method: string } | null;
}

export default function CharterConfirmationPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const [booking, setBooking] = useState<CharterBookingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/charter/bookings/${bookingId}`)
      .then((r) => r.json())
      .then((d) => setBooking(d.booking ?? null))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) return <PageSpinner />;
  if (!booking) return (
    <div className="p-8 text-center text-gray-500">
      Booking not found.{" "}
      <Link href="/my-trips" className="text-blue-600 hover:underline">View My Trips</Link>
    </div>
  );

  const statusInfo = STATUS_LABELS[booking.status] ?? { label: booking.status, color: "bg-gray-100 text-gray-700" };
  const remaining = Number(booking.totalAmount) - Number(booking.depositAmount);

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 text-center">
        <div className="mb-3 text-5xl">{booking.status === "CONFIRMED" ? "🎉" : "📋"}</div>
        <h1 className="text-2xl font-bold text-gray-900">
          {booking.status === "CONFIRMED" ? "Charter Booked!" : "Booking Received"}
        </h1>
        <span className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-center">
          <p className="text-xs text-blue-500">PNR / Booking Reference</p>
          <p className="text-lg font-bold tracking-widest text-blue-900">{booking.pnr.slice(0, 12).toUpperCase()}</p>
        </div>

        <div className="space-y-3 text-sm">
          <Row label="Bus" value={`${booking.bus.name} (${BUS_TYPE_LABELS[booking.bus.busType]})`} />
          <Row label="Operator" value={booking.bus.operator.companyName} />
          <Row label="Dates" value={`${format(new Date(booking.startDate), "d MMM yyyy")} – ${format(new Date(booking.endDate), "d MMM yyyy")} (${booking.numDays} day${booking.numDays > 1 ? "s" : ""})`} />
          <Row label="Estimated Distance" value={`${Number(booking.estimatedKm).toLocaleString()} km`} />
          <Row label="Passengers" value={String(booking.passengerCount)} />
          {booking.pickupAddress && <Row label="Pickup" value={booking.pickupAddress} />}
          {booking.dropAddress && <Row label="Drop" value={booking.dropAddress} />}
          {booking.purpose && <Row label="Purpose" value={booking.purpose} />}
        </div>

        <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Charter Amount</span>
            <span className="font-semibold text-gray-900">₹{Number(booking.totalAmount).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-600">Deposit Paid ({booking.depositPercent}%)</span>
            <span className="font-semibold text-green-600">₹{Number(booking.depositAmount).toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2">
            <span className="text-gray-500">Balance Due</span>
            <span className="font-semibold text-gray-700">₹{remaining.toLocaleString()}</span>
          </div>
        </div>

        {booking.payment && (
          <p className="mt-3 text-xs text-gray-400 text-center">
            Payment via {booking.payment.method} · {booking.payment.status}
          </p>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <Link
          href="/my-trips"
          className="flex-1 rounded-lg border border-gray-300 py-2.5 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          My Trips
        </Link>
        <Link
          href="/"
          className="flex-1 rounded-lg bg-blue-600 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700"
        >
          Home
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}
