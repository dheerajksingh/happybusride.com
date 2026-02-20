"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { format, addDays } from "date-fns";

interface City {
  id: string;
  name: string;
  state: string;
  code: string | null;
}

function CityInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (city: City) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState(value);
  const [cities, setCities] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (query.length < 1) { setCities([]); return; }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/cities?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setCities(data);
        setOpen(true);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      <input
        type="text"
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => query && setOpen(true)}
      />
      {open && cities.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {cities.map((city) => (
            <li
              key={city.id}
              className="cursor-pointer px-4 py-2.5 hover:bg-blue-50"
              onClick={() => {
                onChange(city);
                setQuery(city.name);
                setOpen(false);
              }}
            >
              <span className="font-medium text-gray-900">{city.name}</span>
              <span className="ml-2 text-xs text-gray-500">{city.state}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SearchForm() {
  const router = useRouter();
  const [from, setFrom] = useState<City | null>(null);
  const [to, setTo] = useState<City | null>(null);
  const [date, setDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [error, setError] = useState("");

  function swap() {
    const tmp = from;
    setFrom(to);
    setTo(tmp);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!from) { setError("Please select departure city"); return; }
    if (!to) { setError("Please select destination city"); return; }
    if (from.id === to.id) { setError("Departure and destination cannot be the same"); return; }
    setError("");
    router.push(`/search?from=${from.id}&fromName=${encodeURIComponent(from.name)}&to=${to.id}&toName=${encodeURIComponent(to.name)}&date=${date}`);
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-4">
      <div className="flex items-end gap-2">
        <CityInput
          label="From"
          value={from?.name ?? ""}
          onChange={setFrom}
          placeholder="Departure city"
        />
        <button
          type="button"
          onClick={swap}
          className="mb-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
          title="Swap cities"
        >
          ⇄
        </button>
        <CityInput
          label="To"
          value={to?.name ?? ""}
          onChange={setTo}
          placeholder="Destination city"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Date</label>
        <input
          type="date"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={date}
          min={format(new Date(), "yyyy-MM-dd")}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        className="rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Search Buses
      </button>
    </form>
  );
}
