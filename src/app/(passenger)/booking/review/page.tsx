"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FareBreakdown } from "@/components/passenger/FareBreakdown";
import { PageSpinner } from "@/components/ui/Spinner";
import { calculateFare } from "@/lib/fare";

interface Passenger {
  name: string;
  age: string;
  gender: string;
  seatId: string;
  seatNumber: string;
}

function ReviewContent() {
  const params = useSearchParams();
  const router = useRouter();

  const scheduleId = params.get("scheduleId") ?? "";
  const tripId = params.get("tripId") ?? "";
  const date = params.get("date") ?? "";
  const seatIds = (params.get("seats") ?? "").split(",").filter(Boolean);
  const fromCity = params.get("from") ?? "";
  const toCity = params.get("to") ?? "";
  const boardingStopId = params.get("boardingStopId") ?? "";
  const droppingStopId = params.get("droppingStopId") ?? "";

  const [tripData, setTripData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Extra luggage
  const [hasExtraLuggage, setHasExtraLuggage] = useState(false);
  const [totalLuggageKg, setTotalLuggageKg] = useState(25);
  const [luggageCharge, setLuggageCharge] = useState(0);

  // Shuttle
  const [needsPickup, setNeedsPickup] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupPrice, setPickupPrice] = useState(0);
  const [pickupCityId, setPickupCityId] = useState("");

  const [needsDropoff, setNeedsDropoff] = useState(false);
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffPrice, setDropoffPrice] = useState(0);
  const [dropoffCityId, setDropoffCityId] = useState("");

  // Cab
  const [cabPickup, setCabPickup] = useState(false);
  const [cabPickupPrice, setCabPickupPrice] = useState(0);
  const [cabDropoff, setCabDropoff] = useState(false);
  const [cabDropoffPrice, setCabDropoffPrice] = useState(0);

  useEffect(() => {
    async function load() {
      const qs = new URLSearchParams({ date, ...(fromCity ? { from: fromCity } : {}), ...(toCity ? { to: toCity } : {}) });
      const res = await fetch(`/api/schedules/${scheduleId}/seats?${qs}`);
      if (res.ok) {
        const data = await res.json();
        setTripData(data);
        const seatsInfo = seatIds.map((id) => {
          const seat = data.seats.find((s: any) => s.id === id);
          return seat;
        }).filter(Boolean);

        setPassengers(seatsInfo.map((s: any) => ({
          name: "",
          age: "",
          gender: "M",
          seatId: s.id,
          seatNumber: s.seatNumber,
        })));

        setPickupCityId(data.route?.fromCityId ?? "");
        setDropoffCityId(data.route?.toCityId ?? "");
      }
      setLoading(false);
    }
    if (scheduleId && date && seatIds.length > 0) load();
  }, [scheduleId, date, fromCity, toCity]);

  // Fetch luggage charge when excess weight changes
  useEffect(() => {
    if (!hasExtraLuggage || totalLuggageKg <= 20 || !tripData) {
      setLuggageCharge(0);
      return;
    }
    const excessKg = totalLuggageKg - 20;
    const distanceKm = tripData.route?.distanceKm ?? 200;
    fetch(`/api/pricing/extra-luggage?excessKg=${excessKg}&distanceKm=${distanceKm}`)
      .then(r => r.json())
      .then(d => setLuggageCharge(d.charge ?? 0));
  }, [hasExtraLuggage, totalLuggageKg, tripData]);

  // Fetch shuttle pickup price
  useEffect(() => {
    if (!needsPickup) { setPickupPrice(0); return; }
    fetch(`/api/pricing/shuttle?distanceKm=10&vehicleType=SEATER_8`)
      .then(r => r.json())
      .then(d => setPickupPrice(d.price ?? 80));
  }, [needsPickup]);

  // Fetch shuttle dropoff price
  useEffect(() => {
    if (!needsDropoff) { setDropoffPrice(0); return; }
    fetch(`/api/pricing/shuttle?distanceKm=10&vehicleType=SEATER_8`)
      .then(r => r.json())
      .then(d => setDropoffPrice(d.price ?? 80));
  }, [needsDropoff]);

  // Fetch cab pickup price
  useEffect(() => {
    if (!cabPickup) { setCabPickupPrice(0); return; }
    fetch(`/api/pricing/cab?distanceKm=10&vehicleType=Sedan`)
      .then(r => r.json())
      .then(d => setCabPickupPrice(d.price ?? 100));
  }, [cabPickup]);

  // Fetch cab dropoff price
  useEffect(() => {
    if (!cabDropoff) { setCabDropoffPrice(0); return; }
    fetch(`/api/pricing/cab?distanceKm=10&vehicleType=Sedan`)
      .then(r => r.json())
      .then(d => setCabDropoffPrice(d.price ?? 100));
  }, [cabDropoff]);

  function updatePassenger(index: number, field: keyof Passenger, value: string) {
    setPassengers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function handleConfirm() {
    for (const p of passengers) {
      if (!p.name.trim()) { alert("Please enter name for all passengers"); return; }
      if (!p.age || isNaN(Number(p.age)) || Number(p.age) < 1 || Number(p.age) > 120) {
        alert("Please enter valid age for all passengers");
        return;
      }
    }

    if (needsPickup && !pickupAddress.trim()) { alert("Please enter pickup address"); return; }
    if (needsDropoff && !dropoffAddress.trim()) { alert("Please enter drop-off address"); return; }

    setSubmitting(true);

    const fare = calculateFare(Number(tripData.baseFare), seatIds.length);
    const payRes = await fetch("/api/payments/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripId,
        amount: fare.totalAmount + luggageCharge + pickupPrice + dropoffPrice + cabPickupPrice + cabDropoffPrice,
        method: "UPI",
        seatIds,
        ...(boardingStopId ? { boardingStopId } : {}),
        ...(droppingStopId ? { droppingStopId } : {}),
        passengers: passengers.map((p) => ({
          name: p.name,
          age: Number(p.age),
          gender: p.gender,
          seatId: p.seatId,
        })),
        ...(hasExtraLuggage && totalLuggageKg > 20 ? {
          extraLuggageWeightKg: totalLuggageKg,
          extraLuggageCharge: luggageCharge,
        } : {}),
        ...(needsPickup ? {
          shuttlePickup: { address: pickupAddress, cityId: pickupCityId, price: pickupPrice },
        } : {}),
        ...(needsDropoff ? {
          shuttleDropoff: { address: dropoffAddress, cityId: dropoffCityId, price: dropoffPrice },
        } : {}),
        ...(cabPickup ? {
          cabPickup: { address: pickupAddress || "To be confirmed", cityId: pickupCityId, price: cabPickupPrice },
        } : {}),
        ...(cabDropoff ? {
          cabDropoff: { address: dropoffAddress || "To be confirmed", cityId: dropoffCityId, price: cabDropoffPrice },
        } : {}),
      }),
    });

    const payData = await payRes.json();
    setSubmitting(false);

    if (!payRes.ok) {
      alert(payData.error ?? "Failed to initiate payment");
      return;
    }

    router.push(`/booking/confirm?bookingId=${payData.bookingId}&paymentId=${payData.paymentId}&amount=${payData.amount}`);
  }

  if (loading) return <PageSpinner />;
  if (!tripData) return <div className="p-8 text-center text-gray-500">Trip not found</div>;

  const dep = new Date(tripData.departureTime);
  const arr = new Date(tripData.arrivalTime);
  const arrIsNextDay = arr.toDateString() !== dep.toDateString();
  const fare = calculateFare(Number(tripData.baseFare), seatIds.length);
  const grandTotal = fare.totalAmount + luggageCharge + pickupPrice + dropoffPrice + cabPickupPrice + cabDropoffPrice;

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left: Passenger Details */}
      <div className="flex-1 space-y-6">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h1 className="text-lg font-bold text-gray-900">Review Your Booking</h1>
          <div className="mt-2 text-sm text-gray-600">
            <span className="font-medium">{tripData.route.fromCity?.name ?? tripData.route.from}</span>
            {" → "}
            <span className="font-medium">{tripData.route.toCity?.name ?? tripData.route.to}</span>
            {" · "}
            Dep: {format(dep, "EEE d MMM, HH:mm")} · Arr: {format(arr, arrIsNextDay ? "d MMM, HH:mm" : "HH:mm")}
          </div>
        </div>

        {passengers.map((p, i) => (
          <div key={i} className="rounded-xl bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-gray-900">
              Passenger {i + 1} — Seat {p.seatNumber}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Input
                  label="Full Name"
                  placeholder="As on ID proof"
                  value={p.name}
                  onChange={(e) => updatePassenger(i, "name", e.target.value)}
                />
              </div>
              <div>
                <Input
                  label="Age"
                  type="number"
                  placeholder="Age"
                  value={p.age}
                  onChange={(e) => updatePassenger(i, "age", e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Gender</label>
                <select
                  value={p.gender}
                  onChange={(e) => updatePassenger(i, "gender", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        {/* Extra Luggage */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-gray-900">🧳 Luggage</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hasExtraLuggage}
              onChange={e => setHasExtraLuggage(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">I have luggage over 20kg</span>
          </label>
          {hasExtraLuggage && (
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">Total luggage weight (kg)</label>
              <input
                type="number"
                min={21}
                max={200}
                value={totalLuggageKg}
                onChange={e => setTotalLuggageKg(Number(e.target.value))}
                className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              {totalLuggageKg > 20 && (
                <p className="mt-1 text-sm text-orange-600">
                  Excess: {totalLuggageKg - 20}kg · Extra charge: ₹{luggageCharge.toLocaleString("en-IN")}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Shuttle Pickup */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-gray-900">🚐 Local Shuttle</h3>
          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={needsPickup}
              onChange={e => setNeedsPickup(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">I need pickup from home to bus station</span>
          </label>
          {needsPickup && (
            <div className="ml-6 mb-3">
              <Input
                label="Pickup address"
                placeholder="Your home address"
                value={pickupAddress}
                onChange={e => setPickupAddress(e.target.value)}
              />
              <p className="mt-1 text-sm text-gray-500">
                Estimated cost: ₹{pickupPrice.toLocaleString("en-IN")} · Pickup will be confirmed 36 hours before travel. You&apos;ll be notified.
              </p>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={needsDropoff}
              onChange={e => setNeedsDropoff(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">I need drop-off from bus station to destination</span>
          </label>
          {needsDropoff && (
            <div className="ml-6 mt-3">
              <Input
                label="Drop-off address"
                placeholder="Your destination address"
                value={dropoffAddress}
                onChange={e => setDropoffAddress(e.target.value)}
              />
              <p className="mt-1 text-sm text-gray-500">
                Estimated cost: ₹{dropoffPrice.toLocaleString("en-IN")} · Drop-off will be confirmed 36 hours before travel. You&apos;ll be notified.
              </p>
            </div>
          )}

          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Or book a cab instead</p>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={cabPickup}
                onChange={e => { setCabPickup(e.target.checked); if (e.target.checked) setNeedsPickup(false); }}
                className="h-4 w-4 rounded border-gray-300 text-orange-600"
              />
              <span className="text-sm text-gray-700">Cab pickup (home → bus station)</span>
              {cabPickup && <span className="ml-auto text-sm font-semibold text-orange-600">₹{cabPickupPrice.toLocaleString("en-IN")}</span>}
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cabDropoff}
                onChange={e => { setCabDropoff(e.target.checked); if (e.target.checked) setNeedsDropoff(false); }}
                className="h-4 w-4 rounded border-gray-300 text-orange-600"
              />
              <span className="text-sm text-gray-700">Cab drop-off (bus station → destination)</span>
              {cabDropoff && <span className="ml-auto text-sm font-semibold text-orange-600">₹{cabDropoffPrice.toLocaleString("en-IN")}</span>}
            </label>
          </div>
        </div>
      </div>

      {/* Right: Fare Summary */}
      <div className="w-full lg:w-80">
        <div className="sticky top-4 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
            <h3 className="mb-3 font-semibold text-gray-900">Fare Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Base fare ({seatIds.length} × ₹{Number(tripData.baseFare).toLocaleString()})</span>
                <span>₹{fare.baseFare.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST (5%)</span>
                <span>₹{fare.gstAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Convenience fee</span>
                <span>₹{fare.convenienceFee}</span>
              </div>
              {luggageCharge > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Extra luggage charge</span>
                  <span>₹{luggageCharge.toLocaleString("en-IN")}</span>
                </div>
              )}
              {pickupPrice > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Shuttle pickup</span>
                  <span>₹{pickupPrice.toLocaleString("en-IN")}</span>
                </div>
              )}
              {dropoffPrice > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Shuttle drop-off</span>
                  <span>₹{dropoffPrice.toLocaleString("en-IN")}</span>
                </div>
              )}
              {cabPickupPrice > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Cab pickup</span>
                  <span>₹{cabPickupPrice.toLocaleString("en-IN")}</span>
                </div>
              )}
              {cabDropoffPrice > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Cab drop-off</span>
                  <span>₹{cabDropoffPrice.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
                <span>Total</span>
                <span>₹{grandTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
          <Button className="w-full" size="lg" loading={submitting} onClick={handleConfirm}>
            Proceed to Payment
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BookingReviewPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ReviewContent />
    </Suspense>
  );
}
