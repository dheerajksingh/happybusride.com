"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";

function ConfirmContent() {
  const params = useSearchParams();
  const router = useRouter();
  const bookingId = params.get("bookingId") ?? "";
  const paymentId = params.get("paymentId") ?? "";
  const amount = params.get("amount") ?? "0";

  const [processing, setProcessing] = useState(false);
  const [method, setMethod] = useState("UPI");

  async function handlePay() {
    setProcessing(true);
    const res = await fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, paymentId }),
    });
    const data = await res.json();
    setProcessing(false);

    if (!res.ok) {
      alert(data.error ?? "Payment failed. Please try again.");
      return;
    }

    router.push(`/booking/success/${data.pnr}`);
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-bold text-gray-900">Complete Payment</h1>

        <div className="mb-6 rounded-lg bg-gray-50 p-4 text-center">
          <p className="text-sm text-gray-500">Amount to Pay</p>
          <p className="text-3xl font-bold text-gray-900">₹{Number(amount).toLocaleString()}</p>
        </div>

        <div className="mb-6">
          <p className="mb-3 text-sm font-semibold text-gray-700">Payment Method</p>
          <div className="grid grid-cols-3 gap-2">
            {["UPI", "CARD", "WALLET"].map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                  method === m
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:border-blue-300"
                }`}
              >
                {m === "UPI" ? "📱 UPI" : m === "CARD" ? "💳 Card" : "👛 Wallet"}
              </button>
            ))}
          </div>
        </div>

        {method === "UPI" && (
          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium text-gray-700">UPI ID</label>
            <input
              type="text"
              placeholder="yourname@upi"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
          This is a demo payment. Click Pay Now to complete the booking instantly.
        </div>

        <Button className="w-full" size="lg" loading={processing} onClick={handlePay}>
          Pay ₹{Number(amount).toLocaleString()}
        </Button>
      </div>
    </div>
  );
}

export default function ConfirmPaymentPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ConfirmContent />
    </Suspense>
  );
}
