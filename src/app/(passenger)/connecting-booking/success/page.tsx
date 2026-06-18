"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { PageSpinner } from "@/components/ui/Spinner";

function SuccessContent() {
  const params = useSearchParams();
  const pnr1 = params.get("pnr1") ?? "";
  const pnr2 = params.get("pnr2") ?? "";
  const bookingId1 = params.get("bookingId1") ?? "";
  const bookingId2 = params.get("bookingId2") ?? "";
  const from = params.get("from") ?? "";
  const via = params.get("via") ?? "";
  const to = params.get("to") ?? "";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-green-200 bg-green-50 p-8 text-center shadow-sm">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-green-800 mb-2">Connecting Journey Booked!</h1>
        <p className="text-sm text-gray-600 mb-5">
          {from} → <span className="font-semibold">{via}</span> → {to}
        </p>

        <div className="space-y-3 mb-6">
          {[
            { label: "Leg 1", pnr: pnr1, bookingId: bookingId1, route: `${from} → ${via}` },
            { label: "Leg 2", pnr: pnr2, bookingId: bookingId2, route: `${via} → ${to}` },
          ].map((leg, i) => (
            <div key={i}>
              {i === 1 && (
                <div className="flex items-center justify-center gap-2 text-gray-400 my-2">
                  <div className="h-px w-12 bg-gray-200" />
                  <span className="text-xs">Transfer at {via}</span>
                  <div className="h-px w-12 bg-gray-200" />
                </div>
              )}
              <div className="rounded-xl border border-green-200 bg-white p-4 text-left">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold">{leg.label} PNR</p>
                    <p className="font-mono text-lg font-bold text-gray-900 tracking-wider">{leg.pnr.slice(0, 8).toUpperCase()}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{leg.route}</p>
                  </div>
                  {leg.bookingId && (
                    <Link
                      href={`/my-trips/${leg.bookingId}`}
                      className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      View Ticket →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 mb-5">
          Both bookings are confirmed. Show each ticket QR to the conductor at boarding. Allow sufficient transfer time at {via}.
        </p>

        <div className="flex gap-3 justify-center">
          <Link href="/my-trips" className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700">
            My Trips
          </Link>
          <Link href="/" className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ConnectingSuccessPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <SuccessContent />
    </Suspense>
  );
}
