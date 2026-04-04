"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageSpinner } from "@/components/ui/Spinner";
import { BUS_TYPE_LABELS } from "@/constants/config";

interface CharterBus {
  id: string;
  name: string;
  busType: string;
  totalSeats: number;
  amenities: string[];
  charterRatePerDay: number;
  charterRatePerKm: number;
  charterDepositPercent: number;
  charterCancelPolicy: string | null;
  operator: { companyName: string };
}

const BUS_TYPES = Object.entries(BUS_TYPE_LABELS);

export default function CharterPage() {
  const [buses, setBuses] = useState<CharterBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [busType, setBusType] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (busType) params.set("busType", busType);
    fetch(`/api/charter/buses?${params}`)
      .then((r) => r.json())
      .then((d) => setBuses(d.buses ?? []))
      .finally(() => setLoading(false));
  }, [busType]);

  if (loading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Charter a Bus</h1>
        <p className="mt-1 text-sm text-gray-500">
          Book an entire bus for weddings, pilgrimages, corporate travel, and custom trips.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          value={busType}
          onChange={(e) => { setBusType(e.target.value); setLoading(true); }}
        >
          <option value="">All Bus Types</option>
          {BUS_TYPES.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {buses.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="mb-3 text-4xl">🚌</p>
          <h3 className="font-semibold text-gray-900">No charter buses available</h3>
          <p className="mt-1 text-sm text-gray-500">Check back later or try a different bus type.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {buses.map((bus) => (
            <Link
              key={bus.id}
              href={`/charter/${bus.id}`}
              className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{bus.name}</h3>
                  <p className="text-xs text-gray-500">{bus.operator.companyName}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {BUS_TYPE_LABELS[bus.busType]}
                </span>
              </div>

              <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-gray-50 p-2">
                  <p className="text-xs text-gray-500">Per Day</p>
                  <p className="font-bold text-gray-900">₹{Number(bus.charterRatePerDay).toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2">
                  <p className="text-xs text-gray-500">Per Km</p>
                  <p className="font-bold text-gray-900">₹{Number(bus.charterRatePerKm)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-2">
                  <p className="text-xs text-gray-500">Deposit</p>
                  <p className="font-bold text-gray-900">{bus.charterDepositPercent}%</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">{bus.totalSeats} seats</p>
                <span className="text-sm font-medium text-blue-600">Book Now →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
