"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";

const statusVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  SCHEDULED: "default",
  BOARDING: "info",
  IN_PROGRESS: "success",
  COMPLETED: "success",
  CANCELLED: "danger",
  DELAYED: "warning",
};

export default function DriverHomePage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    fetch("/api/driver/trips")
      .then((r) => r.json())
      .then((t) => { setTrips(Array.isArray(t) ? t : []); setLoading(false); });
  }, []);

  async function handleCheckIn() {
    setCheckingIn(true);
    const res = await fetch("/api/driver/attendance", { method: "POST" });
    setCheckingIn(false);
    if (res.ok) setCheckedIn(true);
  }

  if (loading) return <PageSpinner />;

  const today = new Date().toDateString();
  const todayTrips = trips.filter((t) => new Date(t.travelDate).toDateString() === today);
  const upcomingTrips = trips.filter((t) => new Date(t.travelDate).toDateString() !== today);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">My Trips</h1>
        <Button
          variant={checkedIn ? "secondary" : "primary"}
          loading={checkingIn}
          onClick={handleCheckIn}
          className="text-sm"
        >
          {checkedIn ? "✓ Checked In" : "Check In"}
        </Button>
      </div>

      {todayTrips.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-400">Today</h2>
          <div className="space-y-3">
            {todayTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </div>
      )}

      {upcomingTrips.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase text-gray-400">Upcoming</h2>
          <div className="space-y-3">
            {upcomingTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </div>
      )}

      {trips.length === 0 && (
        <div className="rounded-xl bg-gray-800 p-12 text-center">
          <p className="text-4xl">🚌</p>
          <p className="mt-2 text-gray-400">No trips assigned to you yet.</p>
        </div>
      )}
    </div>
  );
}

function TripCard({ trip }: { trip: any }) {
  return (
    <Link href={`/driver/trips/${trip.id}`} className="block rounded-xl bg-gray-800 p-4 hover:bg-gray-750">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="font-semibold text-white">
            {trip.schedule?.route?.fromCity?.name} → {trip.schedule?.route?.toCity?.name}
          </p>
          <p className="text-sm text-gray-400">{trip.schedule?.bus?.name}</p>
        </div>
        <Badge variant={statusVariant[trip.status] ?? "default"}>
          {trip.status.replace("_", " ")}
        </Badge>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span>📅 {new Date(trip.travelDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
        <span>🎫 {trip._count?.bookings} passengers</span>
      </div>
    </Link>
  );
}
