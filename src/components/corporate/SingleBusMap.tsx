"use client";

import { useEffect, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import type { MapRoute } from "./CorporateMap";

interface Employee { name: string; lat: number; lng: number; }

interface Props {
  route: MapRoute;
  officeAddress: string;
  officeLat: number;
  officeLng: number;
  employees: Employee[];   // home locations for this bus's employees
  height?: string;
}

function makeSvgIcon(color: string, label: string, size = 28) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="${size / 2}" y="${size / 2 + 4}" text-anchor="middle" font-size="11" font-weight="bold" fill="white" font-family="system-ui,sans-serif">${label}</text>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

export default function SingleBusMap({ route, officeAddress, officeLat, officeLng, employees, height = "280px" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    setOptions({ key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "", v: "weekly" });

    Promise.all([importLibrary("maps"), importLibrary("core")]).then(() => {
      const gm = google.maps;
      const color = route.color ?? "#2563eb";

      const map = new gm.Map(containerRef.current!, {
        center: { lat: officeLat, lng: officeLng },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
      });

      const infoWindow = new gm.InfoWindow();

      // Office marker
      new gm.Marker({
        position: { lat: officeLat, lng: officeLng },
        map,
        title: "Office",
        icon: {
          url: makeSvgIcon("#7c3aed", "🏢", 30),
          scaledSize: new gm.Size(30, 30),
          anchor: new gm.Point(15, 15),
        },
        zIndex: 100,
      });

      // Employee home markers (small grey dots)
      employees.forEach((emp) => {
        const empMarker = new gm.Marker({
          position: { lat: emp.lat, lng: emp.lng },
          map,
          title: emp.name,
          icon: {
            url: makeSvgIcon("#94a3b8", "·", 14),
            scaledSize: new gm.Size(14, 14),
            anchor: new gm.Point(7, 7),
          },
          zIndex: 40,
        });
        empMarker.addListener("click", () => {
          infoWindow.setContent(`<b>${emp.name}</b><br><small>Home location</small>`);
          infoWindow.open(map, empMarker);
        });
      });

      // Route polyline
      new gm.Polyline({
        path: route.polyline.map(([lat, lng]) => ({ lat, lng })),
        map,
        strokeColor: color,
        strokeOpacity: 0.9,
        strokeWeight: 4,
      });

      // Pickup stop markers
      route.stops.forEach((stop) => {
        const isOffice = stop.employeeCount === 0;
        const label = isOffice ? "🏢" : String(stop.stopOrder);
        const stopColor = isOffice ? "#7c3aed" : color;

        const marker = new gm.Marker({
          position: { lat: stop.lat, lng: stop.lng },
          map,
          icon: {
            url: makeSvgIcon(stopColor, label, 28),
            scaledSize: new gm.Size(28, 28),
            anchor: new gm.Point(14, 14),
          },
          zIndex: 150,
        });

        marker.addListener("click", () => {
          infoWindow.setContent(
            isOffice
              ? `<b>Office</b><br><small>Arrive by ${stop.pickupTime ?? "—"}</small>`
              : `<b>Stop ${stop.stopOrder}</b><br><small>${stop.employeeCount} employee${stop.employeeCount !== 1 ? "s" : ""} board here</small><br><small>${stop.address}</small>`
          );
          infoWindow.open(map, marker);
        });
      });

      // Fit bounds to all content
      const bounds = new gm.LatLngBounds();
      route.polyline.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
      employees.forEach((e) => bounds.extend({ lat: e.lat, lng: e.lng }));
      map.fitBounds(bounds, 30);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} style={{ height, width: "100%", borderRadius: "8px", overflow: "hidden" }} />
  );
}
