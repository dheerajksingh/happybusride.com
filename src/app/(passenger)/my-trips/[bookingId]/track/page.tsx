"use client";

import { use, useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PageSpinner } from "@/components/ui/Spinner";

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

// Import leaflet CSS only on client
function useLeafletCSS() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }, []);
}

interface BookingData {
  id: string;
  pnr: string;
  trip: {
    currentLat: string | null;
    currentLng: string | null;
    lastLocationAt: string | null;
    schedule: {
      route: {
        fromCity: { name: string };
        toCity: { name: string };
        stops: Array<{ stopOrder: number; city: { name: string } }>;
      };
    };
  };
}

function minutesAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

function BusMap({ lat, lng, stops }: { lat: number; lng: number; stops: BookingData["trip"]["schedule"]["route"]["stops"] }) {
  useLeafletCSS();

  // Fix leaflet default icon issue in Next.js
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const L = require("leaflet");
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  return (
    <div className="h-80 w-full rounded-xl overflow-hidden border border-gray-200">
      <MapContainer center={[lat, lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]}>
          <Popup>🚌 Bus is here</Popup>
        </Marker>
        {stops.map((stop, i) => (
          <Marker key={stop.stopOrder} position={[lat + (i - stops.length / 2) * 0.01, lng]}>
            <Popup>{i + 1}. {stop.city.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default function TrackBusPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadBooking = useCallback(async () => {
    const res = await fetch(`/api/bookings/${bookingId}`);
    if (res.ok) setBooking(await res.json());
    setLastRefresh(new Date());
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    loadBooking();
    const interval = setInterval(loadBooking, 30000);
    return () => clearInterval(interval);
  }, [loadBooking]);

  if (loading) return <PageSpinner />;

  const trip = booking?.trip;
  const lat = trip?.currentLat ? Number(trip.currentLat) : null;
  const lng = trip?.currentLng ? Number(trip.currentLng) : null;
  const hasLocation = lat !== null && lng !== null;
  const stops = trip?.schedule?.route?.stops ?? [];
  const ago = trip?.lastLocationAt ? minutesAgo(trip.lastLocationAt) : null;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex items-center gap-2">
        <Link href={`/my-trips/${bookingId}`} className="text-sm text-blue-600 hover:underline">
          ← Back to Booking
        </Link>
      </div>

      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Live Bus Tracking</h1>
        <p className="text-sm text-gray-500">
          {trip?.schedule?.route?.fromCity?.name} → {trip?.schedule?.route?.toCity?.name}
        </p>
      </div>

      {hasLocation ? (
        <>
          {ago !== null && (
            <div className="mb-3 flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full ${ago < 5 ? "bg-green-500" : "bg-yellow-500"}`} />
              <span className="text-xs text-gray-500">
                Last updated {ago === 0 ? "just now" : `${ago} min ago`}
              </span>
              <button onClick={loadBooking} className="ml-auto text-xs text-blue-600 hover:underline">
                Refresh
              </button>
            </div>
          )}
          <BusMap lat={lat} lng={lng!} stops={stops} />
        </>
      ) : (
        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-10 text-center">
          <p className="text-3xl mb-3">🚌</p>
          <p className="font-semibold text-gray-700">Location not available yet</p>
          <p className="mt-1 text-sm text-gray-500">
            The driver hasn&apos;t started sharing their location. Please check back once the trip is underway.
          </p>
          <button
            onClick={loadBooking}
            className="mt-4 rounded-lg border border-blue-300 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
          >
            Check Again
          </button>
        </div>
      )}

      <p className="mt-4 text-center text-xs text-gray-400">
        Auto-refreshes every 30 seconds · Last checked: {lastRefresh.toLocaleTimeString("en-IN")}
      </p>
    </div>
  );
}
