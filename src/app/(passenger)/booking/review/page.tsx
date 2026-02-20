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

  const [tripData, setTripData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/schedules/${scheduleId}/seats?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setTripData(data);
        // Pre-fill passengers
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
      }
      setLoading(false);
    }
    if (scheduleId && date && seatIds.length > 0) load();
  }, [scheduleId, date]);

  function updatePassenger(index: number, field: keyof Passenger, value: string) {
    setPassengers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function handleConfirm() {
    // Validate passengers
    for (const p of passengers) {
      if (!p.name.trim()) { alert("Please enter name for all passengers"); return; }
      if (!p.age || isNaN(Number(p.age)) || Number(p.age) < 1 || Number(p.age) > 120) {
        alert("Please enter valid age for all passengers");
        return;
      }
    }

    setSubmitting(true);

    // Initiate payment first
    const fare = calculateFare(Number(tripData.baseFare), seatIds.length);
    const payRes = await fetch("/api/payments/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tripId,
        amount: fare.totalAmount,
        method: "UPI",
        seatIds,
        passengers: passengers.map((p) => ({
          name: p.name,
          age: Number(p.age),
          gender: p.gender,
          seatId: p.seatId,
        })),
      }),
    });

    const payData = await payRes.json();
    setSubmitting(false);

    if (!payRes.ok) {
      alert(payData.error ?? "Failed to initiate payment");
      return;
    }

    // Redirect to confirm page
    router.push(`/booking/confirm?bookingId=${payData.bookingId}&paymentId=${payData.paymentId}&amount=${fare.totalAmount}`);
  }

  if (loading) return <PageSpinner />;
  if (!tripData) return <div className="p-8 text-center text-gray-500">Trip not found</div>;

  const dep = new Date(tripData.departureTime);

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
            {format(dep, "EEE, d MMM")} at {format(dep, "HH:mm")}
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
      </div>

      {/* Right: Fare Summary */}
      <div className="w-full lg:w-80">
        <div className="sticky top-4 space-y-4">
          <FareBreakdown pricePerSeat={Number(tripData.baseFare)} seatCount={seatIds.length} />
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
