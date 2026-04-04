"use client";

import { useState, useCallback, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet default icon issue with webpack
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function GeolocationController() {
  const map = useMap();
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 13);
      },
      () => {
        // Permission denied or unavailable — fly to Delhi at street level
        map.setView([28.6139, 77.2090], 12);
      },
      { timeout: 5000 }
    );
  }, [map]);
  return null;
}

export default function MapPicker({ waypoints, onWaypointsChange, onDistanceCalculated }: MapPickerProps) {
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");
  // Road geometry returned by OSRM — array of [lat, lng] pairs
  const [routePath, setRoutePath] = useState<[number, number][]>([]);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      const label = waypoints.length === 0 ? "Start" : waypoints.length === 1 ? "End" : `Stop ${waypoints.length}`;
      onWaypointsChange([...waypoints, { lat, lng, label }]);
      // Clear stale route when waypoints change
      setRoutePath([]);
    },
    [waypoints, onWaypointsChange]
  );

  const removeWaypoint = (index: number) => {
    onWaypointsChange(waypoints.filter((_, i) => i !== index));
    setRoutePath([]);
  };

  const calculateDistance = async () => {
    if (waypoints.length < 2) {
      setError("Add at least 2 waypoints to calculate distance.");
      return;
    }
    setCalculating(true);
    setError("");
    setRoutePath([]);
    try {
      const coords = waypoints.map((w) => `${w.lng},${w.lat}`).join(";");
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
      );
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes?.[0]) {
        setError("Could not calculate route. Try different points.");
        return;
      }
      const distanceKm = parseFloat((data.routes[0].distance / 1000).toFixed(1));
      onDistanceCalculated(distanceKm);

      // GeoJSON coords are [lng, lat] — flip to [lat, lng] for Leaflet
      const coords2d: [number, number][] = data.routes[0].geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng]
      );
      setRoutePath(coords2d);
    } catch {
      setError("Failed to reach routing service. Enter km manually.");
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-gray-200" style={{ height: 360 }}>
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />
          <GeolocationController />
          <ClickHandler onClick={handleMapClick} />
          {waypoints.map((wp, i) => (
            <Marker key={i} position={[wp.lat, wp.lng]} />
          ))}
          {/* Road route from OSRM (shown after Calculate Distance) */}
          {routePath.length >= 2 && (
            <Polyline positions={routePath} color="#2563eb" weight={4} opacity={0.85} />
          )}
          {/* Dashed straight-line preview before route is calculated */}
          {routePath.length === 0 && waypoints.length >= 2 && (
            <Polyline
              positions={waypoints.map((w) => [w.lat, w.lng] as [number, number])}
              color="#94a3b8"
              weight={2}
              dashArray="6 6"
            />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-gray-500">Click on the map to add waypoints. First = pickup, last = drop.</p>

      {waypoints.length > 0 && (
        <div className="space-y-1">
          {waypoints.map((wp, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
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
        {calculating ? "Calculating road route..." : "Calculate Distance"}
      </button>
    </div>
  );
}
