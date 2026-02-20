"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { QRTicket } from "@/components/passenger/QRTicket";
import { PageSpinner } from "@/components/ui/Spinner";

export default function BookingSuccessPage({ params }: { params: Promise<{ pnr: string }> }) {
  const { pnr } = use(params);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/bookings/${pnr}`);
      if (res.ok) setBooking(await res.json());
      setLoading(false);
    }
    load();
  }, [pnr]);

  if (loading) return <PageSpinner />;
  if (!booking) return (
    <div className="py-12 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Booking not found</h1>
      <Link href="/" className="mt-4 inline-block text-sm text-blue-600">Back to Home</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 text-center">
        <div className="mb-3 text-5xl">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h1>
        <p className="mt-1 text-gray-500">Your ticket has been booked successfully.</p>
      </div>

      <QRTicket booking={booking} />

      <div className="mt-6 flex flex-col gap-2">
        <Link
          href={`/my-trips/${booking.id}`}
          className="block w-full rounded-lg bg-blue-600 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
        >
          View Full Ticket
        </Link>
        <Link
          href="/"
          className="block w-full rounded-lg border border-gray-300 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
