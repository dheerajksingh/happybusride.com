"use client";

import { useState, useEffect, useRef } from "react";

export interface City {
  id: string;
  name: string;
  state: string;
  code: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Props {
  label?: string;
  value: string;
  onChange: (city: City) => void;
  placeholder?: string;
  className?: string;
}

export function CityAutocomplete({ label, value, onChange, placeholder = "Search city…", className = "" }: Props) {
  const [query, setQuery] = useState(value);
  const [cities, setCities] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    if (query.length < 1) { setCities([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/cities?q=${encodeURIComponent(query)}`);
      if (res.ok) { setCities(await res.json()); setOpen(true); }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label && <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>}
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => query && setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {open && cities.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {cities.map((city) => (
            <li
              key={city.id}
              className="cursor-pointer px-3 py-2 hover:bg-blue-50 text-sm"
              onClick={() => { onChange(city); setQuery(`${city.name}, ${city.state}`); setOpen(false); }}
            >
              <span className="font-medium text-gray-900">{city.name}</span>
              <span className="text-gray-400"> — </span>
              <span className="text-xs text-gray-500">{city.state}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
