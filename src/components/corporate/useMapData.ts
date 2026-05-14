"use client";

import { useState, useCallback } from "react";
import type { MapEmployee, MapOffice } from "./CorporateMap";

interface RawEmployee {
  id: string;
  name: string;
  address: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

interface RawRequest {
  id?: string;
  officeAddress: string;
  officeLat?: number | string | null;
  officeLng?: number | string | null;
  city: string;
  state: string;
  employees: RawEmployee[];
}

export type MapStatus = "idle" | "loading" | "done" | "error";

export function useMapData() {
  const [status, setStatus] = useState<MapStatus>("idle");
  const [office, setOffice] = useState<MapOffice | null>(null);
  const [employees, setEmployees] = useState<MapEmployee[]>([]);
  const [skipped, setSkipped] = useState(0);

  const load = useCallback(async (req: RawRequest) => {
    setStatus("loading");

    const addressesToGeocode: string[] = [];
    const needsGeocode: { type: "office" | "employee"; idx?: number }[] = [];

    // Resolve office — use stored coords if available, otherwise queue for geocoding
    // IMPORTANT: use a local variable, never read from React state (it's async/stale)
    let resolvedOffice: MapOffice | null = null;

    if (req.officeLat && req.officeLng) {
      resolvedOffice = {
        address: req.officeAddress,
        lat: Number(req.officeLat),
        lng: Number(req.officeLng),
      };
    } else {
      addressesToGeocode.push(`${req.officeAddress}, ${req.city}, ${req.state}, India`);
      needsGeocode.push({ type: "office" });
    }

    const empWithCoords: (MapEmployee | null)[] = req.employees.map((e, i) => {
      if (e.latitude && e.longitude) {
        return { id: e.id, name: e.name, address: e.address, lat: Number(e.latitude), lng: Number(e.longitude) };
      }
      addressesToGeocode.push(`${e.address}, ${req.city}, ${req.state}, India`);
      needsGeocode.push({ type: "employee", idx: i });
      return null;
    });

    // Geocode anything that needs it
    let geocoded: ({ lat: number; lng: number } | null)[] = [];
    if (addressesToGeocode.length > 0) {
      try {
        const res = await fetch("/api/corporate/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ addresses: addressesToGeocode }),
        });
        const data = await res.json();
        geocoded = data.results ?? [];
      } catch {
        setStatus("error");
        return;
      }
    }

    // Merge geocoded results into local variables
    const resolvedEmps: MapEmployee[] = [...(empWithCoords.filter(Boolean) as MapEmployee[])];
    let skippedCount = 0;

    needsGeocode.forEach((item, i) => {
      const coords = geocoded[i];
      if (!coords) { skippedCount++; return; }

      if (item.type === "office") {
        resolvedOffice = { address: req.officeAddress, ...coords };
        // Persist coords to DB so future loads skip geocoding
        if (req.id) {
          fetch(`/api/corporate/requests/${req.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ officeLat: coords.lat, officeLng: coords.lng }),
          }).catch(() => {});
        }
      } else {
        const emp = req.employees[item.idx!];
        resolvedEmps.push({ id: emp.id, name: emp.name, address: emp.address, lat: coords.lat, lng: coords.lng });
      }
    });

    if (!resolvedOffice) {
      setStatus("error");
      return;
    }

    // Commit everything to React state at once
    setOffice(resolvedOffice);
    setEmployees(resolvedEmps);
    setSkipped(skippedCount);
    setStatus("done");
  }, []);

  return { status, office, employees, skipped, load };
}
