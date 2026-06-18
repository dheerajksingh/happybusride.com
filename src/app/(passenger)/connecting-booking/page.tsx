"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { format } from "date-fns";
import { SeatMap } from "@/components/passenger/SeatMap";
import { PageSpinner } from "@/components/ui/Spinner";
import { useSession } from "next-auth/react";

function fmtDateTime(iso: string, baseIso?: string) {
  const d = new Date(iso);
  const base = baseIso ? new Date(baseIso) : null;
  const isNextDay = base && d.toDateString() !== base.toDateString();
  return format(d, isNextDay ? "d MMM, HH:mm" : "HH:mm");
}

interface Passenger {
  name: string;
  age: string;
  gender: string;
  leg1SeatId: string;
  leg2SeatId: string;
}

const STEPS = ["Overview", "Leg 1 Seats", "Leg 2 Seats", "Passengers", "Confirm"];

function ConnectingBookingContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();

  const leg1ScheduleId = params.get("leg1ScheduleId") ?? "";
  const leg2ScheduleId = params.get("leg2ScheduleId") ?? "";
  const date = params.get("date") ?? "";
  const transferCity = params.get("transferCity") ?? "";

  const [step, setStep] = useState(0);
  const [leg1Data, setLeg1Data] = useState<any>(null);
  const [leg2Data, setLeg2Data] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [leg1Seats, setLeg1Seats] = useState<string[]>([]);
  const [leg2Seats, setLeg2Seats] = useState<string[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CARD" | "WALLET">("UPI");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const [r1, r2] = await Promise.all([
        fetch(`/api/schedules/${leg1ScheduleId}/seats?date=${date}`),
        fetch(`/api/schedules/${leg2ScheduleId}/seats?date=${date}`),
      ]);
      if (r1.ok) setLeg1Data(await r1.json());
      if (r2.ok) setLeg2Data(await r2.json());
      setLoading(false);
    }
    if (leg1ScheduleId && leg2ScheduleId && date) load();
  }, [leg1ScheduleId, leg2ScheduleId, date]);

  function proceedToLeg2Seats() {
    if (leg1Seats.length === 0) { setError("Select seats for Leg 1"); return; }
    setError("");
    setStep(2);
  }

  function proceedToPassengers() {
    if (leg2Seats.length === 0) { setError("Select seats for Leg 2"); return; }
    if (leg2Seats.length !== leg1Seats.length) { setError("Select the same number of seats for both legs"); return; }
    setPassengers(leg1Seats.map((leg1SeatId, i) => ({
      name: "",
      age: "",
      gender: "M",
      leg1SeatId,
      leg2SeatId: leg2Seats[i] ?? "",
    })));
    setError("");
    setStep(3);
  }

  function updatePassenger(i: number, field: keyof Passenger, value: string) {
    setPassengers(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function proceedToConfirm() {
    for (const p of passengers) {
      if (!p.name.trim() || !p.age) { setError("Fill in all passenger details"); return; }
    }
    setError(""); setStep(4);
  }

  async function confirmBooking() {
    setSubmitting(true); setError("");
    const res = await fetch("/api/bookings/connecting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leg1: { tripId: leg1Data.tripId, scheduleId: leg1ScheduleId, seatIds: leg1Seats, baseFare: Number(leg1Data.baseFare) },
        leg2: { tripId: leg2Data.tripId, scheduleId: leg2ScheduleId, seatIds: leg2Seats, baseFare: Number(leg2Data.baseFare) },
        passengers,
        paymentMethod,
      }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(d.error ?? "Booking failed"); return; }
    router.push(`/connecting-booking/success?pnr1=${d.booking1.pnr}&pnr2=${d.booking2.pnr}&bookingId1=${d.booking1.bookingId}&bookingId2=${d.booking2.bookingId}&from=${encodeURIComponent(leg1Data?.route?.fromCity?.name ?? "")}&via=${encodeURIComponent(transferCity)}&to=${encodeURIComponent(leg2Data?.route?.toCity?.name ?? "")}`);
  }

  if (loading) return <PageSpinner />;
  if (!leg1Data || !leg2Data) return <div className="p-8 text-center text-gray-500">Could not load journey data.</div>;

  const totalFare = Number(leg1Data.baseFare) * leg1Seats.length + Number(leg2Data.baseFare) * leg2Seats.length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h1 className="text-lg font-bold text-gray-900">Connecting Journey</h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">{leg1Data.route?.fromCity?.name ?? "Origin"}</span>
          <span>→</span>
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{transferCity}</span>
          <span>→</span>
          <span className="font-medium">{leg2Data.route?.toCity?.name ?? "Destination"}</span>
          <span className="text-gray-400">· {date}</span>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i === step ? "bg-blue-600 text-white" : i < step ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"}`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-xs ${i === step ? "font-semibold text-gray-900" : "text-gray-400"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="h-px w-4 bg-gray-200" />}
          </div>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">{error}</div>}

      {/* Step 0: Overview */}
      {step === 0 && (
        <div className="space-y-4">
          {[
            { label: "Leg 1", data: leg1Data, from: leg1Data.route?.fromCity?.name, to: transferCity },
            { label: "Leg 2", data: leg2Data, from: transferCity, to: leg2Data.route?.toCity?.name },
          ].map(({ label, data, from, to }) => (
            <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-400">{label}</span>
                  <p className="font-semibold text-gray-900">{data.bus?.name}</p>
                  <p className="text-sm text-gray-600">{from} → {to}</p>
                  <p className="text-sm text-gray-500">
                    {fmtDateTime(data.departureTime)} – {fmtDateTime(data.arrivalTime, data.departureTime)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">₹{Number(data.baseFare).toLocaleString()}</p>
                  <p className="text-xs text-gray-500">per seat</p>
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <button onClick={() => setStep(1)} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Select Leg 1 Seats →
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Leg 1 seats */}
      {step === 1 && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 font-semibold text-gray-900">Leg 1 — {leg1Data.route?.fromCity?.name} → {transferCity}</h2>
          <p className="mb-4 text-sm text-gray-500">{leg1Data.bus?.name} · {format(new Date(leg1Data.departureTime), "HH:mm")}</p>
          <SeatMap
            seats={leg1Data.seats}
            layoutConfig={leg1Data.bus?.layoutConfig ?? {
              rows: Math.max(...leg1Data.seats.map((s: any) => s.row), 10),
              columns: [...new Set(leg1Data.seats.map((s: any) => s.column))].sort(),
            }}
            selectedIds={leg1Seats}
            onToggle={id => setLeg1Seats(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])}
            currentUserId={session?.user?.id}
            maxSelect={6}
          />
          <div className="mt-4 flex gap-3">
            <button onClick={() => setStep(0)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">Back</button>
            <button onClick={proceedToLeg2Seats} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Select Leg 2 Seats ({leg1Seats.length} selected) →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Leg 2 seats */}
      {step === 2 && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-1 font-semibold text-gray-900">Leg 2 — {transferCity} → {leg2Data.route?.toCity?.name}</h2>
          <p className="mb-1 text-sm text-gray-500">{leg2Data.bus?.name} · {format(new Date(leg2Data.departureTime), "HH:mm")}</p>
          <p className="mb-4 text-xs text-amber-600 font-medium">Select exactly {leg1Seats.length} seat(s) — same number as Leg 1.</p>
          <SeatMap
            seats={leg2Data.seats}
            layoutConfig={leg2Data.bus?.layoutConfig ?? {
              rows: Math.max(...leg2Data.seats.map((s: any) => s.row), 10),
              columns: [...new Set(leg2Data.seats.map((s: any) => s.column))].sort(),
            }}
            selectedIds={leg2Seats}
            onToggle={id => setLeg2Seats(prev => prev.includes(id) ? prev.filter(s => s !== id) : (prev.length < leg1Seats.length ? [...prev, id] : prev))}
            currentUserId={session?.user?.id}
            maxSelect={leg1Seats.length}
          />
          <div className="mt-4 flex gap-3">
            <button onClick={() => setStep(1)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">Back</button>
            <button onClick={proceedToPassengers} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Passenger Details →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Passengers */}
      {step === 3 && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Passenger Details ({passengers.length} passengers)</h2>
          <div className="space-y-3">
            {passengers.map((p, i) => {
              const l1Seat = leg1Data.seats.find((s: any) => s.id === p.leg1SeatId);
              const l2Seat = leg2Data.seats.find((s: any) => s.id === p.leg2SeatId);
              return (
                <div key={i} className="rounded-lg border border-gray-200 p-3">
                  <p className="mb-2 text-xs text-gray-500">Passenger {i + 1} · Leg 1 Seat {l1Seat?.seatNumber} · Leg 2 Seat {l2Seat?.seatNumber}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      placeholder="Full Name"
                      className="col-span-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      value={p.name}
                      onChange={e => updatePassenger(i, "name", e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Age"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      value={p.age}
                      onChange={e => updatePassenger(i, "age", e.target.value)}
                    />
                    <select
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      value={p.gender}
                      onChange={e => updatePassenger(i, "gender", e.target.value)}
                    >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={() => setStep(2)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">Back</button>
            <button onClick={proceedToConfirm} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Review</button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Confirm Connecting Booking</h2>
          <div className="mb-4 rounded-lg bg-gray-50 p-4 text-sm space-y-2">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase">Leg 1</span>
              <p className="text-gray-900">{leg1Data.route?.fromCity?.name} → {transferCity} · {leg1Data.bus?.name}</p>
              <p className="text-gray-600">
                Dep: {fmtDateTime(leg1Data.departureTime)} · Arr: {fmtDateTime(leg1Data.arrivalTime, leg1Data.departureTime)}
              </p>
              <p className="text-gray-600">{leg1Seats.length} seat(s) · ₹{(Number(leg1Data.baseFare) * leg1Seats.length).toLocaleString()}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase">Leg 2</span>
              <p className="text-gray-900">{transferCity} → {leg2Data.route?.toCity?.name} · {leg2Data.bus?.name}</p>
              <p className="text-gray-600">
                Dep: {fmtDateTime(leg2Data.departureTime)} · Arr: {fmtDateTime(leg2Data.arrivalTime, leg2Data.departureTime)}
              </p>
              <p className="text-gray-600">{leg2Seats.length} seat(s) · ₹{(Number(leg2Data.baseFare) * leg2Seats.length).toLocaleString()}</p>
            </div>
            <div className="border-t pt-2 font-semibold text-gray-900">
              Total (est. with taxes): ₹{Math.round(totalFare * 1.05 + 30).toLocaleString()}
            </div>
          </div>

          {/* Payment method */}
          <div className="mb-4">
            <p className="mb-3 text-sm font-semibold text-gray-700">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {(["UPI", "CARD", "WALLET"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                    paymentMethod === m
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:border-blue-300"
                  }`}
                >
                  {m === "UPI" ? "📱 UPI" : m === "CARD" ? "💳 Card" : "👛 Wallet"}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === "UPI" && (
            <div className="mb-4">
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

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">Back</button>
            <button onClick={confirmBooking} disabled={submitting}
              className="flex-1 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {submitting ? "Booking…" : `Pay ₹${Math.round(totalFare * 1.05 + 30).toLocaleString()}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConnectingBookingPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ConnectingBookingContent />
    </Suspense>
  );
}
