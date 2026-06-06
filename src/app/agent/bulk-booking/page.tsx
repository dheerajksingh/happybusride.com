"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BulkPassengerForm, BulkPassenger } from "@/components/passenger/BulkPassengerForm";
import { SeatMap } from "@/components/passenger/SeatMap";
import { useSession } from "next-auth/react";
import { format } from "date-fns";

const STEPS = ["Search", "Seats", "Passengers", "Confirm"];

export default function AgentBulkBookingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState(0);

  // Step 0: Search
  const [cities, setCities] = useState<any[]>([]);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [date, setDate] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedResult, setSelectedResult] = useState<any>(null);

  // Step 1: Seats
  const [seatData, setSeatData] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Step 2: Passengers
  const [passengers, setPassengers] = useState<BulkPassenger[]>([]);

  // Step 3: Confirm
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/cities?limit=500").then(r => r.json()).then(d => setCities(Array.isArray(d) ? d : (d.cities ?? [])));
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
    if (res.ok) {
      const d = await res.json();
      setSeatData(d);
    }
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
      if (!p.name.trim()) { setError("Enter name for all passengers"); return; }
      if (!p.age || isNaN(Number(p.age))) { setError("Enter valid age for all passengers"); return; }
    }
    setError("");
    setStep(3);
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
          name: p.name,
          age: Number(p.age),
          gender: p.gender,
          seatId: p.seatId!,
        })),
        isBulkAgent: true,
      }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(d.error ?? "Booking failed"); return; }
    setBookingResult(d);
  }

  const selectCls = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none";

  if (bookingResult) {
    return (
      <div className="max-w-lg mx-auto rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-xl font-bold text-green-800 mb-1">Bulk Booking Confirmed!</h2>
        <p className="text-sm text-green-700 mb-3">PNR: <span className="font-mono font-bold">{bookingResult.pnr}</span></p>
        <p className="text-sm text-green-700">Total: ₹{Number(bookingResult.totalAmount).toLocaleString("en-IN")}</p>
        <button onClick={() => { setStep(0); setBookingResult(null); setSelectedSeats([]); setPassengers([]); }}
          className="mt-5 rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700">
          Book Another
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Booking</h1>
        <p className="text-sm text-gray-500">Book multiple seats for a group.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i === step ? "bg-orange-600 text-white" : i < step ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"}`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-sm ${i === step ? "font-semibold text-gray-900" : "text-gray-400"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="h-px w-8 bg-gray-200" />}
          </div>
        ))}
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">{error}</div>}

      {/* Step 0: Search */}
      {step === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={doSearch} className="grid grid-cols-4 gap-4 items-end">
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
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
              {searching ? "Searching…" : "Search"}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="mt-6 space-y-3">
              <h2 className="font-semibold text-gray-900">{searchResults.length} buses found</h2>
              {searchResults.map(r => (
                <div key={r.scheduleId} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
                  <div>
                    <div className="font-medium text-gray-900">{r.bus.name}</div>
                    <div className="text-sm text-gray-500">
                      {r.route.from} → {r.route.to} · {format(new Date(r.departureTime), "HH:mm")}
                    </div>
                    <div className="text-sm text-gray-500">{r.availableSeats} seats available · ₹{Number(r.baseFare).toLocaleString()} each</div>
                  </div>
                  <button onClick={() => selectSchedule(r)} disabled={!r.tripId || r.availableSeats === 0}
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
                    Select
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 1: Seat selection */}
      {step === 1 && seatData && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">
            Select Seats — {selectedResult.bus.name} · {selectedSeats.length} selected
          </h2>
          <SeatMap
            seats={seatData.seats}
            layoutConfig={seatData.bus?.layoutConfig ?? {
              rows: Math.max(...seatData.seats.map((s: any) => s.row), 10),
              columns: [...new Set(seatData.seats.map((s: any) => s.column))].sort(),
            }}
            selectedIds={selectedSeats}
            onToggle={(id) => setSelectedSeats(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])}
            currentUserId={session?.user?.id}
            maxSelect={50}
          />
          <div className="mt-4 flex gap-3">
            <button onClick={() => setStep(0)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Back</button>
            <button onClick={proceedToPassengers}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
              Continue with {selectedSeats.length} seats
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Passengers */}
      {step === 2 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Passenger Details ({passengers.length} seats)</h2>
          <BulkPassengerForm passengers={passengers} onUpdate={setPassengers} maxPassengers={selectedSeats.length} />
          <div className="mt-4 flex gap-3">
            <button onClick={() => setStep(1)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Back</button>
            <button onClick={proceedToConfirm}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
              Review & Confirm
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Confirm Booking</h2>
          <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm">
            <p className="font-medium text-gray-900">{selectedResult.bus.name}</p>
            <p className="text-gray-600">{selectedResult.route.from} → {selectedResult.route.to} · {date}</p>
            <p className="text-gray-600">{selectedSeats.length} seats · ₹{Number(selectedResult.baseFare).toLocaleString()} each</p>
            <p className="mt-2 font-semibold text-gray-900">
              Estimated Total: ₹{(selectedSeats.length * Number(selectedResult.baseFare) * 1.05 + 30).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="mb-4 space-y-1 text-sm max-h-48 overflow-y-auto">
            {passengers.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-600">
                <span className="w-5 text-xs text-gray-400">{i + 1}.</span>
                <span>{p.name}</span>
                <span className="text-gray-400">·</span>
                <span>{p.age}y</span>
                <span className="text-gray-400">·</span>
                <span>{p.gender}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Back</button>
            <button onClick={confirmBooking} disabled={submitting}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
              {submitting ? "Booking…" : "Confirm Booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
