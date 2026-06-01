"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const ref    = params.get("ref")    ?? "";
  const total  = params.get("total")  ?? "0";
  const origin = params.get("origin") ?? "0";

  return (
    <div className="mx-auto max-w-lg py-12 text-center">
      <div className="text-6xl mb-4">✅</div>
      <h1 className="text-2xl font-black text-gray-900 mb-2">Freight Booked!</h1>
      <p className="text-gray-500 mb-6">The walk-in sender's shipment is confirmed.</p>

      <div className="rounded-xl border border-gray-200 bg-white p-6 text-left space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Booking Ref</span>
          <span className="font-mono font-bold text-gray-900">{ref.slice(0, 12).toUpperCase()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total charged to sender</span>
          <span className="font-bold text-orange-600">₹{Number(total).toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Your origin handling fee</span>
          <span className="font-semibold text-green-700">₹{Number(origin).toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 text-left mb-6">
        The sender now has a HappyBusRide account linked to their phone number.
        They can log in via OTP to track their shipment anytime.
      </div>

      <div className="flex gap-3">
        <Link href="/agent/freight/book-walkin"
          className="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Book Another
        </Link>
        <Link href="/agent/freight"
          className="flex-1 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600">
          Back to Freight
        </Link>
      </div>
    </div>
  );
}

export default function WalkInSuccessPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-gray-400">Loading…</div>}>
      <SuccessContent />
    </Suspense>
  );
}
