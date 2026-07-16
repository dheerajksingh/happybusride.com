"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";

interface ScanResult {
  valid: boolean;
  message?: string;
  pnr?: string;
  status?: string;
  verifiedByToken?: boolean;
  passengerName?: string;
  phone?: string;
  travelDate?: string;
  routeName?: string;
  boardingStop?: string | null;
  droppingStop?: string | null;
  seats?: string[];
  passengers?: Array<{ name: string; age: number; gender: string; seatNumber: string | null }>;
}

const SCANNER_ID = "qr-scanner-viewport";

function DriverScanContent() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("tripId") ?? "";

  const [pnr, setPnr] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  async function stopScanner() {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        // already stopped
      }
    }
  }

  // Stop the camera when leaving the page
  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  async function verify(pnrValue: string, token?: string) {
    setLoading(true);
    setResult(null);
    setError("");

    try {
      const res = await fetch("/api/driver/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, pnr: pnrValue.trim(), token }),
      });
      if (res.ok) {
        setResult(await res.json());
      } else {
        const d = await res.json().catch(() => null);
        setError(d?.error ?? "Verification failed");
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  // A ticket QR contains JSON: { pnr, token, ... } (v1 and v2).
  // Fall back to treating the raw text as a PNR.
  function handleDecoded(text: string) {
    stopScanner();
    try {
      const data = JSON.parse(text);
      if (data?.pnr) {
        setPnr(String(data.pnr));
        verify(String(data.pnr), typeof data.token === "string" ? data.token : undefined);
        return;
      }
    } catch {
      // not JSON — raw PNR
    }
    setPnr(text);
    verify(text);
  }

  async function startScanner() {
    setResult(null);
    setError("");
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      // Wait for the viewport div to render
      await new Promise((r) => setTimeout(r, 50));
      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => handleDecoded(decoded),
        () => {} // per-frame decode misses — ignore
      );
    } catch (err) {
      setScanning(false);
      scannerRef.current = null;
      setError(
        err instanceof Error && /permission|NotAllowed/i.test(err.message)
          ? "Camera permission denied — allow camera access or enter the PNR manually"
          : "Could not start the camera — enter the PNR manually"
      );
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!pnr.trim() || !tripId) return;
    verify(pnr);
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

      {!tripId && (
        <p className="mb-4 rounded-lg bg-yellow-900/40 border border-yellow-700 p-3 text-xs text-yellow-400">
          ⚠ No trip specified — open this page from a trip
        </p>
      )}

      {/* Camera QR scan */}
      <div className="mb-4 rounded-xl bg-gray-800 p-4">
        {scanning ? (
          <>
            <div id={SCANNER_ID} className="overflow-hidden rounded-lg" />
            <button
              onClick={stopScanner}
              className="mt-3 w-full rounded-lg border border-gray-600 py-2 text-sm text-gray-300 hover:bg-gray-700"
            >
              Stop Camera
            </button>
          </>
        ) : (
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={!tripId || loading}
            onClick={startScanner}
          >
            📷 Scan Ticket QR
          </Button>
        )}
      </div>

      {/* Manual PNR entry */}
      <form onSubmit={handleVerify} className="mb-6 rounded-xl bg-gray-800 p-4">
        <label className="mb-2 block text-sm font-medium text-gray-300">Or Enter PNR Number</label>
        <input
          type="text"
          value={pnr}
          onChange={(e) => setPnr(e.target.value)}
          placeholder="e.g. HBR1A2B3C"
          className="mb-3 w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 font-mono text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <Button type="submit" variant="secondary" loading={loading} className="w-full" disabled={!pnr.trim() || !tripId}>
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
                {result.verifiedByToken && (
                  <span className="rounded bg-green-800 px-1.5 py-0.5 text-[10px] font-medium text-green-300">QR VERIFIED</span>
                )}
                <span className="ml-auto font-mono text-xs text-gray-400">{result.pnr}</span>
              </div>
              <p className="text-lg font-bold text-white">{result.passengerName}</p>
              {result.phone && <p className="text-sm text-gray-400">{result.phone}</p>}

              <div className="mt-3 space-y-1 text-sm text-gray-300">
                {result.routeName && <p>Route: <span className="text-white">{result.routeName}</span></p>}
                {result.travelDate && <p>Date: <span className="text-white">{result.travelDate}</span></p>}
                {result.boardingStop && (
                  <p>Boards at: <span className="font-semibold text-white">{result.boardingStop}</span></p>
                )}
                {result.droppingStop && (
                  <p>Gets off at: <span className="font-semibold text-white">{result.droppingStop}</span></p>
                )}
                <p>
                  Seat(s): <span className="font-semibold text-white">{result.seats?.join(", ") || "—"}</span>
                </p>
              </div>

              {(result.passengers?.length ?? 0) > 0 && (
                <div className="mt-3 space-y-1 border-t border-gray-700 pt-2">
                  {result.passengers!.map((p, i) => (
                    <p key={i} className="text-xs text-gray-400">
                      {p.name} · {p.age} yrs · {p.gender}
                      {p.seatNumber && <span className="text-gray-200"> · Seat {p.seatNumber}</span>}
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
            Verify another passenger
          </button>
        </div>
      )}
    </div>
  );
}

export default function DriverScanPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <DriverScanContent />
    </Suspense>
  );
}
