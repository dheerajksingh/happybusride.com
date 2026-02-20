"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { SeatMap } from "@/components/passenger/SeatMap";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { BUS_TYPE_LABELS } from "@/constants/config";

interface SeatData {
  scheduleId: string;
  tripId: string;
  route: { from: string; to: string };
  bus: { name: string; busType: string; layoutConfig: any; amenities: string[] };
  departureTime: string;
  arrivalTime: string;
  baseFare: number;
  fareRules: { seatType: string; price: number }[];
  seats: any[];
}

export default function SeatSelectionPage({ params }: { params: Promise<{ scheduleId: string }> }) {
  const { scheduleId } = use(params);
  const searchParams = useSearchParams();
  const date = searchParams.get("date") ?? "";
  const router = useRouter();
  const { data: session } = useSession();

  const [data, setData] = useState<SeatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [locking, setLocking] = useState(false);
  const [lockExpiry, setLockExpiry] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/schedules/${scheduleId}/seats?date=${date}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
      setLoading(false);
    }
    if (scheduleId && date) load();
  }, [scheduleId, date]);

  // Countdown timer for seat lock
  useEffect(() => {
    if (!lockExpiry) return;
    const interval = setInterval(() => {
      const secs = Math.max(0, Math.floor((lockExpiry.getTime() - Date.now()) / 1000));
      setCountdown(secs);
      if (secs === 0) {
        setSelected([]);
        setLockExpiry(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockExpiry]);

  const handleToggle = useCallback((seatId: string) => {
    setSelected((prev) =>
      prev.includes(seatId) ? prev.filter((id) => id !== seatId) : [...prev, seatId]
    );
  }, []);

  async function handleProceed() {
    if (!session) {
      const callbackUrl = encodeURIComponent(window.location.href);
      router.push(`/login?callbackUrl=${callbackUrl}`);
      return;
    }
    if (!data || selected.length === 0) return;

    setLocking(true);
    const res = await fetch("/api/seats/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId: data.tripId, seatIds: selected }),
    });

    const json = await res.json();
    setLocking(false);

    if (!res.ok) {
      alert(json.error ?? "Could not lock seats. Please try again.");
      return;
    }

    setLockExpiry(new Date(json.expiresAt));

    // Navigate to review page with seats in URL state
    const params = new URLSearchParams({
      scheduleId,
      tripId: data.tripId,
      date,
      seats: selected.join(","),
    });
    router.push(`/booking/review?${params}`);
  }

  if (loading) return <PageSpinner />;
  if (!data) return <div className="p-8 text-center text-gray-500">Schedule not found</div>;

  const dep = new Date(data.departureTime);
  const arr = new Date(data.arrivalTime);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left: Seat Map */}
      <div className="flex-1">
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-1 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {data.route.from} → {data.route.to}
              </h1>
              <p className="text-sm text-gray-500">
                {format(dep, "EEE, d MMM")} · {format(dep, "HH:mm")} – {format(arr, "HH:mm")}
              </p>
            </div>
            <div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                {BUS_TYPE_LABELS[data.bus.busType] ?? data.bus.busType}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-900">Select Your Seats</h2>
          <SeatMap
            seats={data.seats}
            layoutConfig={data.bus.layoutConfig}
            selectedIds={selected}
            onToggle={handleToggle}
            currentUserId={session?.user?.id}
            maxSelect={6}
          />
        </div>
      </div>

      {/* Right: Summary */}
      <div className="w-full lg:w-80">
        <div className="sticky top-4 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-gray-900">Booking Summary</h2>

          {lockExpiry && countdown > 0 && (
            <div className="mb-3 rounded-lg bg-orange-50 p-3 text-center">
              <p className="text-xs text-orange-700">Seats reserved for</p>
              <p className="text-2xl font-bold text-orange-600">
                {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
              </p>
            </div>
          )}

          <div className="mb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Seats selected</span>
              <span className="font-medium">{selected.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Price per seat</span>
              <span className="font-medium">₹{Number(data.baseFare).toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-100 pt-2">
              <div className="flex justify-between font-semibold">
                <span>Subtotal</span>
                <span>₹{(selected.length * Number(data.baseFare)).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {selected.length > 0 && (
            <div className="mb-4">
              <p className="mb-1 text-xs font-semibold uppercase text-gray-400">Selected seats</p>
              <div className="flex flex-wrap gap-1">
                {selected.map((id) => {
                  const seat = data.seats.find((s: any) => s.id === id);
                  return (
                    <span key={id} className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {seat?.seatNumber}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <Button
            className="w-full"
            disabled={selected.length === 0}
            loading={locking}
            onClick={handleProceed}
          >
            Proceed to Book ({selected.length} seat{selected.length !== 1 ? "s" : ""})
          </Button>
          <p className="mt-2 text-center text-xs text-gray-400">Seats will be held for 5 minutes</p>
        </div>
      </div>
    </div>
  );
}
