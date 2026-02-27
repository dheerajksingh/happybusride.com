"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface ScanResult {
  valid: boolean;
  message?: string;
  pnr?: string;
  status?: string;
  passengerName?: string;
  phone?: string;
  seats?: string[];
  passengers?: Array<{ name: string; age: number; gender: string }>;
}

export default function DriverScanPage() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("tripId") ?? "";

  const [pnr, setPnr] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!pnr.trim() || !tripId) return;
    setLoading(true);
    setResult(null);
    setError("");

    const res = await fetch("/api/driver/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId, pnr: pnr.trim() }),
    });

    setLoading(false);
    if (res.ok) {
      setResult(await res.json());
    } else {
      const d = await res.json();
      setError(d.error ?? "Verification failed");
    }
  }

  function handleReset() {
    setPnr("");
    setResult(null);
    setError("");
  }

  return (
    <div className="max-w-md">
      <div className="mb-4">
        <Link
          href={tripId ? `/driver/trips/${tripId}` : "/driver"}
          className="text-sm text-blue-400 hover:underline"
        >
          ← Back
        </Link>
      </div>

      <h1 className="mb-6 text-xl font-bold text-white">Verify Passenger</h1>

      <form onSubmit={handleVerify} className="mb-6 rounded-xl bg-gray-800 p-4">
        <label className="mb-2 block text-sm font-medium text-gray-300">Enter PNR Number</label>
        <input
          type="text"
          value={pnr}
          onChange={(e) => setPnr(e.target.value.toUpperCase())}
          placeholder="e.g. HBR1A2B3C"
          className="mb-3 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 font-mono text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {!tripId && (
          <p className="mb-3 text-xs text-yellow-400">⚠ No trip ID specified — open from a trip page</p>
        )}
        <Button type="submit" variant="primary" loading={loading} className="w-full" disabled={!pnr.trim() || !tripId}>
          Verify PNR
        </Button>
      </form>

      {error && (
        <div className="mb-4 rounded-xl bg-red-900/40 border border-red-700 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className={`rounded-xl border p-5 ${result.valid ? "bg-green-900/40 border-green-600" : "bg-red-900/40 border-red-700"}`}>
          {result.valid ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xl">✅</span>
                <span className="font-semibold text-green-400">CONFIRMED</span>
                <span className="ml-auto font-mono text-xs text-gray-400">{result.pnr}</span>
              </div>
              <p className="text-lg font-bold text-white">{result.passengerName}</p>
              {result.phone && <p className="text-sm text-gray-400">{result.phone}</p>}
              <p className="mt-2 text-sm text-gray-300">
                Seat(s):{" "}
                <span className="font-semibold text-white">{result.seats?.join(", ") || "—"}</span>
              </p>
              {(result.passengers?.length ?? 0) > 0 && (
                <div className="mt-3 space-y-1">
                  {result.passengers!.map((p, i) => (
                    <p key={i} className="text-xs text-gray-400">
                      {p.name} · {p.age} yrs · {p.gender}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xl">❌</span>
              <span className="font-semibold text-red-400">{result.message ?? "PNR not found"}</span>
            </div>
          )}
          <button
            onClick={handleReset}
            className="mt-4 text-xs text-gray-400 hover:text-gray-200 underline"
          >
            Verify another PNR
          </button>
        </div>
      )}
    </div>
  );
}
