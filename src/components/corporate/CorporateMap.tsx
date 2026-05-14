"use client";

import { useEffect, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

export interface MapEmployee {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface MapOffice {
  address: string;
  lat: number;
  lng: number;
}

export interface MapRoute {
  polyline: [number, number][];   // [lat, lng][]
  stops: {
    stopOrder: number;
    address: string;
    lat: number;
    lng: number;
    employeeCount: number;
    pickupTime?: string | null;
  }[];
  distanceKm: string;
  durationMins: number;
  color?: string;
  isFallback?: boolean;
  employees?: { name: string; lat: number; lng: number }[];
}

interface Props {
  office: MapOffice;
  employees: MapEmployee[];
  height?: string;
  requestId?: string;
  routes?: MapRoute[];   // multiple routes, one per bus
}

// ── Helpers ───────────────────────────────────────────────────

function clusterEmployees(employees: MapEmployee[]) {
  const GRID = 0.015;
  const buckets = new Map<string, MapEmployee[]>();
  for (const emp of employees) {
    const key = `${Math.round(emp.lat / GRID)},${Math.round(emp.lng / GRID)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(emp);
  }
  return Array.from(buckets.values());
}

function centroid(cluster: MapEmployee[]) {
  return {
    lat: cluster.reduce((s, e) => s + e.lat, 0) / cluster.length,
    lng: cluster.reduce((s, e) => s + e.lng, 0) / cluster.length,
  };
}

const CLUSTER_COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

function makeSvgIcon(color: string, label: string, size = 30) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="${size / 2}" y="${size / 2 + 4}" text-anchor="middle" font-size="12" font-weight="bold" fill="white" font-family="system-ui,sans-serif">${label}</text>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

async function savePosition(requestId: string, empId: string, lat: number, lng: number) {
  const res = await fetch(`/api/corporate/requests/${requestId}/employees/${empId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  });
  return res.ok;
}

// ── Component ─────────────────────────────────────────────────

export default function CorporateMap({
  office,
  employees,
  height = "400px",
  requestId,
  routes,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggable = !!requestId;

  useEffect(() => {
    if (!containerRef.current) return;

    setOptions({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
      v: "weekly",
    });

    // Load maps + core so google.maps.* globals are fully available
    Promise.all([importLibrary("maps"), importLibrary("core")]).then(() => {
      const gm = google.maps;

      const map = new gm.Map(containerRef.current!, {
        center: { lat: office.lat, lng: office.lng },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      const infoWindow = new gm.InfoWindow();

      // ── Office marker ──────────────────────────────────────
      const officeMarker = new gm.Marker({
        position: { lat: office.lat, lng: office.lng },
        map,
        title: "Office",
        icon: {
          url: makeSvgIcon("#7c3aed", "🏢", 36),
          scaledSize: new gm.Size(36, 36),
          anchor: new gm.Point(18, 18),
        },
        zIndex: 100,
      });
      officeMarker.addListener("click", () => {
        infoWindow.setContent(`<b>Office</b><br><small>${office.address}</small>`);
        infoWindow.open(map, officeMarker);
      });

      // ── Employee home markers ──────────────────────────────
      employees.forEach((emp) => {
        const empId = emp.id;
        const rid = requestId;

        const empMarker = new gm.Marker({
          position: { lat: emp.lat, lng: emp.lng },
          map,
          title: emp.name,
          draggable,
          icon: {
            url: makeSvgIcon("#94a3b8", "👤", 22),
            scaledSize: new gm.Size(22, 22),
            anchor: new gm.Point(11, 11),
          },
          zIndex: 50,
        });

        empMarker.addListener("click", () => {
          infoWindow.setContent(
            `<b>${emp.name}</b><br><small>${emp.address}</small>` +
              (draggable ? `<br><small style="color:#7c3aed">Drag to adjust position</small>` : "")
          );
          infoWindow.open(map, empMarker);
        });

        if (draggable && rid) {
          empMarker.addListener("dragend", () => {
            const pos = empMarker.getPosition()!;
            infoWindow.setContent(`<b>${emp.name}</b><br><small>Saving…</small>`);
            infoWindow.open(map, empMarker);
            savePosition(rid, empId, pos.lat(), pos.lng()).then((ok) => {
              infoWindow.setContent(
                ok
                  ? `<b>${emp.name}</b><br><small>${emp.address}</small><br><small style="color:#16a34a">✅ Position saved</small>`
                  : `<b>${emp.name}</b><br><small style="color:#dc2626">⚠️ Save failed</small>`
              );
            });
          });
        }
      });

      if (routes && routes.length > 0) {
        // ── ROUTE MODE: one polyline + numbered stops per route ──

        const bounds = new gm.LatLngBounds();
        employees.forEach((e) => bounds.extend({ lat: e.lat, lng: e.lng }));

        routes.forEach((route, routeIdx) => {
          const routeColor = route.color ?? CLUSTER_COLORS[routeIdx % CLUSTER_COLORS.length];
          const routeLabel = routes.length > 1 ? `Bus ${routeIdx + 1}` : "";

          new gm.Polyline({
            path: route.polyline.map(([lat, lng]) => ({ lat, lng })),
            map,
            strokeColor: routeColor,
            strokeOpacity: 0.9,
            strokeWeight: 5,
          });

          route.polyline.forEach(([lat, lng]) => bounds.extend({ lat, lng }));

          route.stops.forEach((stop) => {
            const isOffice = stop.employeeCount === 0;
            const label = isOffice ? "🏢" : String(stop.stopOrder);
            const color = isOffice ? "#7c3aed" : routeColor;

            const stopMarker = new gm.Marker({
              position: { lat: stop.lat, lng: stop.lng },
              map,
              icon: {
                url: makeSvgIcon(color, label, 32),
                scaledSize: new gm.Size(32, 32),
                anchor: new gm.Point(16, 16),
              },
              zIndex: 200,
            });

            stopMarker.addListener("click", () => {
              infoWindow.setContent(
                isOffice
                  ? `<b>Office (Destination)</b><br><small>${stop.address}</small><br><small>Arrive by ${stop.pickupTime ?? "—"}</small>`
                  : `<b>${routeLabel ? routeLabel + " · " : ""}Stop ${stop.stopOrder}</b><br><small>${stop.employeeCount} employee${stop.employeeCount !== 1 ? "s" : ""} board here</small>`
              );
              infoWindow.open(map, stopMarker);
            });
          });
        });

        map.fitBounds(bounds, 50);

      } else if (employees.length > 0) {
        // ── CLUSTER MODE: dashed lines from clusters to office ──

        const clusters = clusterEmployees(employees);
        clusters.forEach((cluster, idx) => {
          const color = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];
          const center = centroid(cluster);

          new gm.Polyline({
            path: [center, { lat: office.lat, lng: office.lng }],
            map,
            strokeColor: color,
            strokeOpacity: 0,
            strokeWeight: 3,
            icons: [
              {
                icon: {
                  path: "M 0,-1 0,1",
                  strokeOpacity: 0.7,
                  scale: 4,
                  strokeColor: color,
                },
                offset: "0",
                repeat: "16px",
              },
            ],
          });

          const clusterMarker = new gm.Marker({
            position: center,
            map,
            icon: {
              url: makeSvgIcon(color, `${cluster.length}`, 28),
              scaledSize: new gm.Size(28, 28),
              anchor: new gm.Point(14, 14),
            },
            zIndex: 80,
          });

          clusterMarker.addListener("click", () => {
            infoWindow.setContent(
              `<b>Cluster ${idx + 1}</b><br>${cluster.length} employee${cluster.length > 1 ? "s" : ""}<br><small>${cluster.map((e) => e.name).join(", ")}</small>`
            );
            infoWindow.open(map, clusterMarker);
          });
        });

        const bounds = new gm.LatLngBounds();
        bounds.extend({ lat: office.lat, lng: office.lng });
        employees.forEach((e) => bounds.extend({ lat: e.lat, lng: e.lng }));
        map.fitBounds(bounds, 50);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={containerRef}
        style={{ height, width: "100%", borderRadius: "8px", overflow: "hidden" }}
      />
      {draggable && (!routes || routes.length === 0) && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.6)",
            color: "#fff",
            borderRadius: 20,
            padding: "3px 12px",
            fontSize: 11,
            pointerEvents: "none",
            zIndex: 1000,
            whiteSpace: "nowrap",
          }}
        >
          👤 Drag any employee marker to correct its position
        </div>
      )}
    </div>
  );
}
