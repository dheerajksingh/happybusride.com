"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { PageSpinner } from "@/components/ui/Spinner";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

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

// ── Google Map for live bus tracking ─────────────────────────

function BusMap({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const busMarkerRef = useRef<google.maps.Marker | null>(null);

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current) return;

    setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "", v: "weekly" });

    importLibrary("maps").then((mapsLib) => {
      const { Map, Marker, InfoWindow } = mapsLib as any;

      if (mapRef.current) {
        // Already initialised — just move the bus marker
        busMarkerRef.current?.setPosition({ lat, lng });
        mapRef.current.panTo({ lat, lng });
        return;
      }

      const map = new Map(containerRef.current!, {
        center: { lat, lng },
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      mapRef.current = map;

      const busIcon = {
        url:
          "data:image/svg+xml;charset=UTF-8," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="19" fill="#2563eb" stroke="white" stroke-width="2"/>
              <text x="20" y="26" text-anchor="middle" font-size="20" font-family="system-ui">🚌</text>
            </svg>`
          ),
        scaledSize: new (window as any).google.maps.Size(40, 40),
        anchor: new (window as any).google.maps.Point(20, 20),
      };

      const busMarker = new Marker({
        position: { lat, lng },
        map,
        title: "Your bus",
        icon: busIcon,
        zIndex: 100,
      });
      busMarkerRef.current = busMarker;

      const infoWindow = new InfoWindow({ content: "<b>🚌 Bus is here</b>" });
      busMarker.addListener("click", () => infoWindow.open(map, busMarker));
      infoWindow.open(map, busMarker);
    });

    return () => { mapRef.current = null; busMarkerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move bus marker on position updates without re-initialising the map
  useEffect(() => {
    if (!mapRef.current || !busMarkerRef.current) return;
    busMarkerRef.current.setPosition({ lat, lng });
    mapRef.current.panTo({ lat, lng });
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      className="h-80 w-full rounded-xl overflow-hidden border border-gray-200"
    />
  );
}

// ── Page ──────────────────────────────────────────────────────

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
  const ago = trip?.lastLocationAt ? minutesAgo(trip.lastLocationAt) : null;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4">
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
              <span
                className={`inline-block h-2 w-2 rounded-full ${ago < 5 ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`}
              />
              <span className="text-xs text-gray-500">
                Last updated {ago === 0 ? "just now" : `${ago} min ago`}
              </span>
              <button
                onClick={loadBooking}
                className="ml-auto text-xs text-blue-600 hover:underline"
              >
                Refresh
              </button>
            </div>
          )}
          <BusMap lat={lat} lng={lng!} />
        </>
      ) : (
        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-10 text-center">
          <p className="text-3xl mb-3">🚌</p>
          <p className="font-semibold text-gray-700">Location not available yet</p>
          <p className="mt-1 text-sm text-gray-500">
            The driver hasn&apos;t started sharing their location. Check back once the trip is underway.
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
