"use client";

import { use, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PageSpinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BUS_TYPE_LABELS } from "@/constants/config";
import type { Waypoint } from "./MapPicker";

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false, loading: () => <div className="flex h-[360px] items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-500">Loading map…</div> });

interface BusDetail {
  id: string;
  name: string;
  busType: string;
  totalSeats: number;
  amenities: string[];
  charterRatePerDay: number;
  charterRatePerKm: number;
  charterDepositPercent: number;
  charterCancelPolicy: string | null;
  operator: { companyName: string; cancellationPolicy: string };
}

export default function CharterBookPage({ params }: { params: Promise<{ busId: string }> }) {
  const { busId } = use(params);
  const router = useRouter();
  const [bus, setBus] = useState<BusDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    startDate: today,
    endDate: today,
    estimatedKm: "",
    passengerCount: 1,
    purpose: "",
    pickupAddress: "",
    dropAddress: "",
    paymentMethod: "UPI" as "WALLET" | "UPI" | "CARD",
  });

  useEffect(() => {
    fetch(`/api/charter/buses/${busId}`)
      .then((r) => r.json())
      .then((d) => setBus(d.bus ?? null))
      .finally(() => setLoading(false));
  }, [busId]);

  const pricing = useMemo(() => {
    if (!bus || !form.startDate || !form.endDate || !form.estimatedKm) return null;
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (end < start) return null;
    const msPerDay = 86400000;
    const numDays = Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
    const km = Number(form.estimatedKm);
    if (!km || km <= 0) return null;
    const total = numDays * bus.charterRatePerDay + km * bus.charterRatePerKm;
    const deposit = Math.ceil((total * bus.charterDepositPercent) / 100);
    return { numDays, total: parseFloat(total.toFixed(2)), deposit };
  }, [bus, form.startDate, form.endDate, form.estimatedKm]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bus || !pricing) return;
    setError("");
    setSubmitting(true);

    try {
      const bookRes = await fetch("/api/charter/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          busId,
          startDate: form.startDate,
          endDate: form.endDate,
          estimatedKm: Number(form.estimatedKm),
          passengerCount: form.passengerCount,
          purpose: form.purpose || undefined,
          pickupAddress: form.pickupAddress || undefined,
          dropAddress: form.dropAddress || undefined,
          routeWaypoints: waypoints,
          paymentMethod: form.paymentMethod,
        }),
      });

      const bookData = await bookRes.json();
      if (!bookRes.ok) { setError(bookData.error ?? "Booking failed"); return; }

      const confirmRes = await fetch(`/api/charter/book/${bookData.bookingId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const confirmData = await confirmRes.json();
      if (!confirmRes.ok) { setError(confirmData.error ?? "Payment failed"); return; }

      router.push(`/charter/confirmation/${bookData.bookingId}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageSpinner />;
  if (!bus) return (
    <div className="p-8 text-center text-gray-500">
      Bus not found or not available for charter.{" "}
      <Link href="/charter" className="text-blue-600 hover:underline">Browse buses</Link>
    </div>
  );

  return (
    <div>
      <div className="mb-4">
        <Link href="/charter" className="text-sm text-blue-600 hover:underline">← Charter Buses</Link>
      </div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Book {bus.name}</h1>
      <p className="mb-6 text-sm text-gray-500">{bus.operator.companyName} · {BUS_TYPE_LABELS[bus.busType]} · {bus.totalSeats} seats</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Map */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-gray-900">Plan Your Route</h2>
          <MapPicker
            waypoints={waypoints}
            onWaypointsChange={setWaypoints}
            onDistanceCalculated={(km) => setForm((f) => ({ ...f, estimatedKm: String(km) }))}
          />
        </div>

        {/* Booking form */}
        <form onSubmit={handleSubmit} className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Booking Details</h2>

          {/* Rates info */}
          <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-blue-50 p-3 text-center text-sm">
            <div>
              <p className="text-xs text-blue-500">Per Day</p>
              <p className="font-bold text-blue-900">₹{bus.charterRatePerDay.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-blue-500">Per Km</p>
              <p className="font-bold text-blue-900">₹{bus.charterRatePerKm}</p>
            </div>
            <div>
              <p className="text-xs text-blue-500">Deposit</p>
              <p className="font-bold text-blue-900">{bus.charterDepositPercent}%</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Date"
                type="date"
                min={today}
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                required
              />
              <Input
                label="End Date"
                type="date"
                min={form.startDate}
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                required
              />
            </div>

            <Input
              label="Estimated Distance (km)"
              type="number"
              min={1}
              step="0.1"
              value={form.estimatedKm}
              onChange={(e) => setForm((f) => ({ ...f, estimatedKm: e.target.value }))}
              placeholder="Auto-filled by map or enter manually"
              required
            />

            <Input
              label="Passenger Count"
              type="number"
              min={1}
              max={bus.totalSeats}
              value={form.passengerCount}
              onChange={(e) => setForm((f) => ({ ...f, passengerCount: Number(e.target.value) }))}
              required
            />

            <Input
              label="Pickup Address (optional)"
              value={form.pickupAddress}
              onChange={(e) => setForm((f) => ({ ...f, pickupAddress: e.target.value }))}
              placeholder="Starting point address"
            />

            <Input
              label="Drop Address (optional)"
              value={form.dropAddress}
              onChange={(e) => setForm((f) => ({ ...f, dropAddress: e.target.value }))}
              placeholder="Final destination address"
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Purpose (optional)</label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="e.g. Wedding, Pilgrimage, Corporate trip"
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Payment Method</label>
              <select
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
                value={form.paymentMethod}
                onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value as "WALLET" | "UPI" | "CARD" }))}
              >
                <option value="UPI">UPI</option>
                <option value="CARD">Card</option>
                <option value="WALLET">Wallet</option>
              </select>
            </div>
          </div>

          {/* Price preview */}
          {pricing && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{pricing.numDays} day{pricing.numDays > 1 ? "s" : ""} × ₹{bus.charterRatePerDay.toLocaleString()}</span>
                <span>₹{(pricing.numDays * bus.charterRatePerDay).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{form.estimatedKm} km × ₹{bus.charterRatePerKm}</span>
                <span>₹{(Number(form.estimatedKm) * bus.charterRatePerKm).toLocaleString()}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
                <span>Total</span>
                <span>₹{pricing.total.toLocaleString()}</span>
              </div>
              <div className="mt-1 flex justify-between text-blue-600">
                <span>Deposit now ({bus.charterDepositPercent}%)</span>
                <span>₹{pricing.deposit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-xs mt-1">
                <span>Remaining (pay later)</span>
                <span>₹{(pricing.total - pricing.deposit).toLocaleString()}</span>
              </div>
            </div>
          )}

          {bus.charterCancelPolicy && (
            <p className="mt-3 text-xs text-gray-500">
              <span className="font-medium">Cancellation policy:</span> {bus.charterCancelPolicy}
            </p>
          )}

          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={!pricing || submitting}
            className="mt-4 w-full"
          >
            {pricing ? `Book & Pay Deposit ₹${pricing.deposit.toLocaleString()}` : "Fill in dates & distance"}
          </Button>
        </form>
      </div>
    </div>
  );
}
