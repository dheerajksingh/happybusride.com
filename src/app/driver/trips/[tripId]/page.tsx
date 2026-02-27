"use client";

import { use, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import Link from "next/link";

const STATUS_FLOW: Record<string, string> = {
  SCHEDULED: "BOARDING",
  BOARDING: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
};

const statusVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  SCHEDULED: "default",
  BOARDING: "info",
  IN_PROGRESS: "success",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export default function DriverTripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [locating, setLocating] = useState(false);

  async function loadTrip() {
    const res = await fetch(`/api/driver/trips/${tripId}`);
    if (res.ok) setTrip(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadTrip(); }, [tripId]);

  async function updateStatus() {
    const next = STATUS_FLOW[trip?.status];
    if (!next) return;
    setUpdating(true);
    await fetch(`/api/driver/trips/${tripId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setUpdating(false);
    loadTrip();
  }

  async function shareLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await fetch("/api/driver/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, lat: pos.coords.latitude, lng: pos.coords.longitude }),
      });
      setLocating(false);
    }, () => {
      alert("Could not get location");
      setLocating(false);
    });
  }

  if (loading) return <PageSpinner />;
  if (!trip) return <div className="text-white">Trip not found</div>;

  const nextStatus = STATUS_FLOW[trip.status];

  return (
    <div className="max-w-lg">
      <div className="mb-4">
        <Link href="/driver" className="text-sm text-blue-400 hover:underline">← My Trips</Link>
      </div>

      {/* Trip Header */}
      <div className="mb-4 rounded-xl bg-gray-800 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white">
            {trip.schedule?.route?.fromCity?.name} → {trip.schedule?.route?.toCity?.name}
          </h1>
          <Badge variant={statusVariant[trip.status] ?? "default"}>
            {trip.status.replace("_", " ")}
          </Badge>
        </div>
        <p className="text-sm text-gray-400">
          {trip.schedule?.bus?.name} ·{" "}
          {new Date(trip.travelDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Actions */}
      <div className="mb-4 flex gap-3">
        {nextStatus && (
          <Button variant="primary" loading={updating} onClick={updateStatus} className="flex-1">
            Mark as {nextStatus.replace("_", " ")}
          </Button>
        )}
        {trip.status === "IN_PROGRESS" && (
          <Button variant="secondary" loading={locating} onClick={shareLocation}>
            📍 Share Location
          </Button>
        )}
      </div>
      {(trip.status === "BOARDING" || trip.status === "IN_PROGRESS") && (
        <div className="mb-4">
          <Link
            href={`/driver/scan?tripId=${tripId}`}
            className="block w-full rounded-lg border border-blue-500 py-3 text-center text-sm font-semibold text-blue-400 hover:bg-blue-900/20 transition-colors"
          >
            🎫 Verify Passenger PNR
          </Link>
        </div>
      )}

      {/* Passenger List */}
      <div className="rounded-xl bg-gray-800 p-4">
        <h2 className="mb-3 font-semibold text-white">
          Passengers ({trip.bookings?.length ?? 0} bookings)
        </h2>
        <div className="space-y-2">
          {(trip.bookings ?? []).map((booking: any) => (
            <div key={booking.id} className="rounded-lg border border-gray-700 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{booking.user?.name}</p>
                  <p className="text-xs text-gray-400">{booking.user?.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">
                    {booking.seats?.map((s: any) => s.seat?.seatNumber).join(", ")}
                  </p>
                  <p className="text-xs font-mono text-gray-400">{booking.pnr}</p>
                </div>
              </div>
              {booking.passengers?.map((p: any, i: number) => (
                <p key={i} className="mt-1 text-xs text-gray-500">{p.name} ({p.age} yrs, {p.gender})</p>
              ))}
            </div>
          ))}
          {(!trip.bookings || trip.bookings.length === 0) && (
            <p className="text-sm text-gray-500">No bookings yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
