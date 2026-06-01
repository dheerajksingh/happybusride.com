"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BulkPassengerForm, BulkPassenger } from "@/components/passenger/BulkPassengerForm";
import { SeatMap } from "@/components/passenger/SeatMap";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { PageSpinner } from "@/components/ui/Spinner";

const STEPS = ["Search", "Seats", "Passengers", "Confirm"];

function BulkBookingContent() {
  const sp = useSearchParams();
  const { data: session } = useSession();

  const [step, setStep] = useState(0);
  const [cities, setCities] = useState<any[]>([]);
  const [fromId, setFromId] = useState(sp.get("from") ?? "");
  const [toId, setToId] = useState(sp.get("to") ?? "");
  const [date, setDate] = useState(sp.get("date") ?? "");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [seatData, setSeatData] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengers, setPassengers] = useState<BulkPassenger[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/cities").then(r => r.json()).then(d => setCities(d.cities ?? []));
  }, []);

  async function doSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true); setError("");
    const res = await fetch(`/api/search?from=${fromId}&to=${toId}&date=${date}`);
    const d = await res.json();
    setSearchResults(d.results ?? []);
    setSearching(false);
  }

  async function selectSchedule(result: any) {
    setSelectedResult(result);
    const res = await fetch(`/api/schedules/${result.scheduleId}/seats?date=${date}`);
    if (res.ok) setSeatData(await res.json());
    setStep(1);
  }

  function proceedToPassengers() {
    if (selectedSeats.length === 0) { setError("Select at least one seat"); return; }
    setPassengers(selectedSeats.map(seatId => {
      const seat = seatData?.seats?.find((s: any) => s.id === seatId);
      return { name: "", age: "", gender: "M", seatId, seatNumber: seat?.seatNumber };
    }));
    setStep(2);
  }

  function proceedToConfirm() {
    for (const p of passengers) {
      if (!p.name.trim() || !p.age) { setError("Fill in all passenger details"); return; }
    }
    setError(""); setStep(3);
  }

  async function confirmBooking() {
    setSubmitting(true); setError("");
    const res = await fetch("/api/bookings/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripId: selectedResult.tripId,
        seatIds: selectedSeats,
        passengers: passengers.map(p => ({
          name: p.name, age: Number(p.age), gender: p.gender, seatId: p.seatId!,
        })),
        isBulkAgent: false,
      }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(d.error ?? "Booking failed"); return; }
    setBookingResult(d);
  }

  const selectCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none";

  if (bookingResult) {
    return (
      <div className="max-w-lg mx-auto rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h2 className="text-xl font-bold text-green-800 mb-1">Group Booking Confirmed!</h2>
        <p className="text-sm text-green-700 mb-2">PNR: <span className="font-mono font-bold">{bookingResult.pnr}</span></p>
        <p className="text-sm text-green-700">Total: ₹{Number(bookingResult.totalAmount).toLocaleString("en-IN")}</p>
        <button onClick={() => { setStep(0); setBookingResult(null); setSelectedSeats([]); setPassengers([]); }}
          className="mt-5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Book Another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Group Booking</h1>
        <p className="text-sm text-gray-500">Book multiple seats for your group.</p>
      </div>

      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${i === step ? "bg-blue-600 text-white" : i < step ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"}`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-sm ${i === step ? "font-semibold text-gray-900" : "text-gray-400"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="h-px w-6 bg-gray-200" />}
          </div>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">{error}</div>}

      {step === 0 && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <form onSubmit={doSearch} className="grid grid-cols-1 gap-4 sm:grid-cols-4 items-end">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">From</label>
              <select required className={selectCls} value={fromId} onChange={e => setFromId(e.target.value)}>
                <option value="">Select city</option>
                {cities.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">To</label>
              <select required className={selectCls} value={toId} onChange={e => setToId(e.target.value)}>
                <option value="">Select city</option>
                {cities.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
              <input type="date" required className={selectCls} value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <button type="submit" disabled={searching}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {searching ? "Searching…" : "Search"}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-5 space-y-3">
              {searchResults.map(r => (
                <div key={r.scheduleId} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                  <div>
                    <div className="font-medium text-gray-900">{r.bus.name}</div>
                    <div className="text-sm text-gray-500">{r.route.from} → {r.route.to} · {format(new Date(r.departureTime), "HH:mm")}</div>
                    <div className="text-sm text-gray-500">{r.availableSeats} seats · ₹{Number(r.baseFare).toLocaleString()} each</div>
                  </div>
                  <button onClick={() => selectSchedule(r)} disabled={!r.tripId || r.availableSeats === 0}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    Select
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 1 && seatData && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Select Seats ({selectedSeats.length} selected)</h2>
          <SeatMap
            seats={seatData.seats}
            layoutConfig={seatData.bus?.layoutConfig ?? {
              rows: Math.max(...seatData.seats.map((s: any) => s.row), 10),
              columns: [...new Set(seatData.seats.map((s: any) => s.column))].sort(),
            }}
            selectedIds={selectedSeats}
            onToggle={id => setSelectedSeats(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])}
            currentUserId={session?.user?.id}
            maxSelect={50}
          />
          <div className="mt-4 flex gap-3">
            <button onClick={() => setStep(0)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Back</button>
            <button onClick={proceedToPassengers} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Continue ({selectedSeats.length} seats)
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Passenger Details</h2>
          <BulkPassengerForm passengers={passengers} onUpdate={setPassengers} maxPassengers={selectedSeats.length} />
          <div className="mt-4 flex gap-3">
            <button onClick={() => setStep(1)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Back</button>
            <button onClick={proceedToConfirm} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Review</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Confirm Group Booking</h2>
          <div className="mb-4 rounded-lg bg-gray-50 p-4 text-sm">
            <p className="font-medium">{selectedResult.bus.name} — {selectedResult.route.from} → {selectedResult.route.to}</p>
            <p className="text-gray-500">{date} · {selectedSeats.length} passengers</p>
          </div>
          <div className="mb-4 max-h-48 overflow-y-auto space-y-1 text-sm">
            {passengers.map((p, i) => (
              <div key={i} className="text-gray-600">{i + 1}. {p.name} · {p.age}y · {p.gender}</div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">Back</button>
            <button onClick={confirmBooking} disabled={submitting}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
              {submitting ? "Booking…" : "Confirm"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PassengerBulkBookingPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <BulkBookingContent />
    </Suspense>
  );
}
