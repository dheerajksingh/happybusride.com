"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { PageSpinner } from "@/components/ui/Spinner";

function SuccessContent() {
  const params = useSearchParams();
  const pnr1 = params.get("pnr1") ?? "";
  const pnr2 = params.get("pnr2") ?? "";
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
          <div className="rounded-xl border border-green-200 bg-white p-4">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Leg 1 PNR</p>
            <p className="font-mono text-lg font-bold text-gray-900 tracking-wider">{pnr1}</p>
            <p className="text-xs text-gray-500 mt-0.5">{from} → {via}</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <div className="h-px w-12 bg-gray-200" />
            <span className="text-xs">Transfer at {via}</span>
            <div className="h-px w-12 bg-gray-200" />
          </div>
          <div className="rounded-xl border border-green-200 bg-white p-4">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Leg 2 PNR</p>
            <p className="font-mono text-lg font-bold text-gray-900 tracking-wider">{pnr2}</p>
            <p className="text-xs text-gray-500 mt-0.5">{via} → {to}</p>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-5">
          Both bookings are linked. Show both PNRs at boarding. Please allow sufficient transfer time at {via}.
        </p>

        <div className="flex gap-3 justify-center">
          <Link href="/my-trips" className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700">
            View My Trips
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
