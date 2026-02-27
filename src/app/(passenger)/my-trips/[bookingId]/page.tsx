"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { PageSpinner } from "@/components/ui/Spinner";
import { QRTicket } from "@/components/passenger/QRTicket";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

const REVIEW_TAGS = ["Punctual", "Clean Bus", "Friendly Driver", "Comfortable", "AC Working"];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="text-2xl leading-none transition-transform hover:scale-110"
        >
          <span className={(hovered || value) >= star ? "text-yellow-400" : "text-gray-300"}>★</span>
        </button>
      ))}
    </div>
  );
}

export default function BookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState<string>("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (res.ok) setBooking(await res.json());
      setLoading(false);
    }
    load();
  }, [bookingId]);

  function toggleTag(tag: string) {
    setReviewTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reviewRating === 0) return;
    setReviewSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId,
        rating: reviewRating,
        comment: reviewComment || undefined,
        tags: reviewTags,
      }),
    });
    setReviewSubmitting(false);
    if (res.ok) {
      setReviewDone(true);
      setBooking((prev: any) => ({ ...prev, review: { rating: reviewRating } }));
    } else {
      const d = await res.json();
      alert(d.error ?? "Could not submit review");
    }
  }

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

      {/* Review Section */}
      {booking.status === "COMPLETED" && !booking.review && !reviewDone && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Rate your journey</h2>
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <StarRating value={reviewRating} onChange={setReviewRating} />

            <div className="flex flex-wrap gap-2">
              {REVIEW_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    reviewTags.includes(tag)
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 text-gray-600 hover:border-blue-400"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
              placeholder="Share your experience (optional)..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />

            <Button
              type="submit"
              variant="primary"
              loading={reviewSubmitting}
              disabled={reviewRating === 0}
              className="w-full"
            >
              Submit Review
            </Button>
          </form>
        </div>
      )}

      {booking.status === "COMPLETED" && (booking.review || reviewDone) && (
        <div className="mt-6 rounded-2xl bg-green-50 border border-green-200 p-5 text-center">
          <p className="text-2xl">⭐ {booking.review?.rating ?? reviewRating}/5</p>
          <p className="mt-1 text-sm text-green-700 font-medium">Review submitted — thank you!</p>
        </div>
      )}

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
