"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { OTPInput } from "@/components/ui/OTPInput";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import {
  isOtpWidgetEnabled,
  widgetVerifyOtp,
  widgetRetryOtp,
  widgetSendOtp,
} from "@/lib/msg91-widget";

function VerifyContent() {
  const params = useSearchParams();
  const phone = params.get("phone") ?? "";
  const callbackUrl = params.get("callbackUrl") ?? "/";
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    setError("");
    setLoading(true);

    // Verify OTP — via the MSG91 widget (client SDK) when configured,
    // otherwise via our server-side verify endpoint (dev fallback).
    try {
      if (isOtpWidgetEnabled()) {
        const accessToken = await widgetVerifyOtp(otp);
        const res = await fetch("/api/otp/widget-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, accessToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "OTP verification failed");
      } else {
        const res = await fetch("/api/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code: otp }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Invalid OTP");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
      setLoading(false);
      return;
    }

    // Sign in via NextAuth OTP provider (consumes the server-side proof)
    const signInResult = await signIn("otp", {
      phone,
      redirect: false,
    });

    setLoading(false);

    if (signInResult?.error) {
      setError("Login failed. Please try again.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  async function handleResend() {
    setResending(true);
    try {
      if (isOtpWidgetEnabled()) {
        // Retry within the current widget transaction; if there is none
        // (e.g. the page was refreshed), start a fresh send.
        try {
          await widgetRetryOtp();
        } catch {
          await widgetSendOtp(phone);
        }
      } else {
        await fetch("/api/otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
      }
      setOtp("");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Enter OTP</h1>
      <p className="mb-6 text-sm text-gray-500">
        We sent a 6-digit code to <span className="font-semibold text-gray-700">+91 {phone}</span>
      </p>

      <form onSubmit={handleVerify} className="flex flex-col items-center gap-4">
        <OTPInput value={otp} onChange={setOtp} disabled={loading} />

        {error && <p className="w-full text-sm text-red-600">{error}</p>}

        {process.env.NODE_ENV === "development" && (
          <p className="w-full rounded-lg bg-yellow-50 p-2 text-xs text-yellow-700">
            Dev mode: OTP is <strong>123456</strong>
          </p>
        )}

        <Button type="submit" loading={loading} disabled={otp.length !== 6} className="w-full">
          Verify OTP
        </Button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-blue-600 hover:underline disabled:opacity-50"
        >
          {resending ? "Sending..." : "Resend OTP"}
        </button>
      </form>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <VerifyContent />
    </Suspense>
  );
}
