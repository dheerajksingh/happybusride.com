"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

export interface Waypoint {
  lat: number;
  lng: number;
  label?: string;
}

interface MapPickerProps {
  waypoints: Waypoint[];
  onWaypointsChange: (wps: Waypoint[]) => void;
  onDistanceCalculated: (km: number) => void;
}

export default function MapPicker({ waypoints, onWaypointsChange, onDistanceCalculated }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  // Stable refs so click/calculate closures always see current values
  const waypointsRef = useRef(waypoints);
  const onChangeRef = useRef(onWaypointsChange);
  const onDistRef = useRef(onDistanceCalculated);
  useEffect(() => { waypointsRef.current = waypoints; }, [waypoints]);
  useEffect(() => { onChangeRef.current = onWaypointsChange; }, [onWaypointsChange]);
  useEffect(() => { onDistRef.current = onDistanceCalculated; }, [onDistanceCalculated]);

  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");
  const [routeShown, setRouteShown] = useState(false);

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "", v: "weekly" });

    importLibrary("maps").then((mapsLib) => {
      const { Map, Marker, Polyline } = mapsLib as any;

      const map = new Map(containerRef.current!, {
        center: { lat: 20.5937, lng: 78.9629 },
        zoom: 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      mapRef.current = map;

      // Try to center on user's location
      navigator.geolocation?.getCurrentPosition(
        (pos) => map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => map.setCenter({ lat: 28.6139, lng: 77.209 }),
        { timeout: 5000 }
      );

      // Click to add waypoints
      map.addListener("click", (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        const current = waypointsRef.current;
        const label =
          current.length === 0 ? "Start" :
          current.length === 1 ? "End" :
          `Stop ${current.length}`;
        onChangeRef.current([...current, { lat, lng, label }]);
        polylineRef.current?.setMap(null);
        polylineRef.current = null;
        setRouteShown(false);
      });

      // Store constructors for use in marker/polyline sync
      (mapRef.current as any).__gmaps = { Marker, Polyline };
    });

    return () => { mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers whenever waypoints change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const { Marker } = (map as any).__gmaps ?? {};
    if (!Marker) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Remove old preview polyline
    polylineRef.current?.setMap(null);
    polylineRef.current = null;

    // Add new markers
    waypoints.forEach((wp, i) => {
      const isFirst = i === 0;
      const isLast = i === waypoints.length - 1 && waypoints.length > 1;
      const color = isFirst ? "#16a34a" : isLast ? "#dc2626" : "#2563eb";
      const label = wp.label ?? `${i + 1}`;

      const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="13" fill="${color}" stroke="white" stroke-width="2"/>
        <text x="14" y="19" text-anchor="middle" font-size="11" font-weight="bold" fill="white" font-family="system-ui">${label.length > 3 ? i + 1 : label}</text>
      </svg>`;

      const marker = new Marker({
        position: { lat: wp.lat, lng: wp.lng },
        map,
        title: wp.label ?? `Point ${i + 1}`,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgIcon),
          scaledSize: new (window as any).google.maps.Size(28, 28),
          anchor: new (window as any).google.maps.Point(14, 14),
        },
      });
      markersRef.current.push(marker);
    });

    // Draw dashed preview line if route not yet calculated
    if (!routeShown && waypoints.length >= 2) {
      const { Polyline } = (map as any).__gmaps;
      const preview = new Polyline({
        path: waypoints.map((w) => ({ lat: w.lat, lng: w.lng })),
        map,
        strokeColor: "#94a3b8",
        strokeOpacity: 0,
        strokeWeight: 2,
        icons: [{
          icon: { path: "M 0,-1 0,1", strokeOpacity: 0.6, scale: 3, strokeColor: "#94a3b8" },
          offset: "0",
          repeat: "12px",
        }],
      });
      polylineRef.current = preview;
    }
  }, [waypoints, routeShown]);

  const removeWaypoint = (index: number) => {
    onChangeRef.current(waypoints.filter((_, i) => i !== index));
    polylineRef.current?.setMap(null);
    polylineRef.current = null;
    setRouteShown(false);
  };

  const calculateDistance = useCallback(async () => {
    if (waypoints.length < 2) {
      setError("Add at least 2 waypoints to calculate distance.");
      return;
    }
    setCalculating(true);
    setError("");

    try {
      const res = await fetch("/api/charter/route-distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waypoints: waypoints.map((w) => ({ lat: w.lat, lng: w.lng })) }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not calculate route. Try different points.");
        return;
      }

      // Draw road polyline on map
      const map = mapRef.current;
      if (map && (map as any).__gmaps) {
        const { Polyline } = (map as any).__gmaps;
        polylineRef.current?.setMap(null);
        const roadLine = new Polyline({
          path: (data.polyline as [number, number][]).map(([lat, lng]) => ({ lat, lng })),
          map,
          strokeColor: "#2563eb",
          strokeOpacity: 0.85,
          strokeWeight: 4,
        });
        polylineRef.current = roadLine;
        setRouteShown(true);
      }

      onDistRef.current(data.distanceKm);
    } catch {
      setError("Failed to calculate route. Please try again.");
    } finally {
      setCalculating(false);
    }
  }, [waypoints]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-gray-200" style={{ height: 360 }}>
        <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      </div>

      <p className="text-xs text-gray-500">
        Click on the map to add waypoints.
        <span className="ml-1 inline-flex gap-3">
          <span>🟢 Start</span>
          <span>🔵 Stops</span>
          <span>🔴 End</span>
        </span>
      </p>

      {waypoints.length > 0 && (
        <div className="space-y-1">
          {waypoints.map((wp, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
            >
              <span className="text-gray-700">
                <span className="mr-2 font-medium">{wp.label ?? `Point ${i + 1}`}</span>
                <span className="text-xs text-gray-400">
                  {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeWaypoint(i)}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="button"
        onClick={calculateDistance}
        disabled={waypoints.length < 2 || calculating}
        className="w-full rounded-lg border border-blue-300 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
      >
        {calculating ? "Calculating road route…" : "Calculate Distance via Google Maps"}
      </button>
    </div>
  );
}
