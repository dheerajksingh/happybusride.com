"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { PageSpinner } from "@/components/ui/Spinner";
import { QRTicket } from "@/components/passenger/QRTicket";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export default function BookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState<string>("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (res.ok) setBooking(await res.json());
      setLoading(false);
    }
    load();
  }, [bookingId]);

  async function handleCancel() {
    setCancelling(true);
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Cancelled by passenger" }),
    });
    const data = await res.json();
    setCancelling(false);
    if (res.ok) {
      setCancelResult(data.message);
      setBooking((prev: any) => ({ ...prev, status: "CANCELLED_USER" }));
      setCancelModal(false);
    } else {
      alert(data.error ?? "Cancellation failed");
    }
  }

  if (loading) return <PageSpinner />;
  if (!booking) return (
    <div className="py-12 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Booking not found</h1>
      <Link href="/my-trips" className="mt-4 inline-block text-sm text-blue-600">← Back to My Trips</Link>
    </div>
  );

  const canCancel = booking.status === "CONFIRMED";
  const dep = new Date(booking.trip.schedule.departureTime);
  const isFuture = dep > new Date();

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/my-trips" className="text-sm text-blue-600 hover:underline">← My Trips</Link>
      </div>

      {cancelResult && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{cancelResult}</div>
      )}

      <QRTicket booking={booking} />

      <div className="mt-6 space-y-2">
        {isFuture && booking.status === "CONFIRMED" && (
          <Link
            href={`/my-trips/${bookingId}/track`}
            className="block w-full rounded-lg border border-blue-600 py-3 text-center text-sm font-semibold text-blue-600 hover:bg-blue-50"
          >
            Track Bus Live
          </Link>
        )}
        {canCancel && isFuture && (
          <button
            onClick={() => setCancelModal(true)}
            className="block w-full rounded-lg border border-red-300 py-3 text-center text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Cancel Booking
          </button>
        )}
      </div>

      <Modal
        open={cancelModal}
        onClose={() => setCancelModal(false)}
        title="Cancel Booking?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelModal(false)}>Keep Booking</Button>
            <Button variant="danger" loading={cancelling} onClick={handleCancel}>Yes, Cancel</Button>
          </>
        }
      >
        <p>Are you sure you want to cancel this booking? Refund amount depends on the cancellation policy.</p>
      </Modal>
    </div>
  );
}
