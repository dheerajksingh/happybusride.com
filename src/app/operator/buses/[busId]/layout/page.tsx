"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { PageSpinner } from "@/components/ui/Spinner";
import { SeatLayoutBuilder } from "@/components/operator/SeatLayoutBuilder";

export default function BusLayoutPage({ params }: { params: Promise<{ busId: string }> }) {
  const { busId } = use(params);
  const [bus, setBus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/operator/buses/${busId}`)
      .then((r) => r.json())
      .then((b) => { setBus(b); setLoading(false); });
  }, [busId]);

  if (loading) return <PageSpinner />;
  if (!bus) return <div>Bus not found</div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/operator/buses" className="text-sm text-blue-600 hover:underline">← Bus Fleet</Link>
      </div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{bus.name} — Seat Layout</h1>
        <p className="text-sm text-gray-500">{bus.registrationNo} · {bus.busType.replace(/_/g, " ")}</p>
      </div>

      {saved && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-700">
          ✓ Seat layout saved! Seats have been generated.
        </div>
      )}

      <SeatLayoutBuilder
        busId={busId}
        busType={bus.busType}
        initialLayout={bus.layoutConfig}
        onSave={(_, seatsCreated) => {
          setSaved(true);
          setTimeout(() => setSaved(false), 5000);
        }}
      />

      <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
        <strong>Next step:</strong> Go to{" "}
        <Link href="/operator/routes" className="underline">Routes</Link> to create bus routes,
        then{" "}
        <Link href="/operator/schedules" className="underline">Schedules</Link> to set up trips.
      </div>
    </div>
  );
}
