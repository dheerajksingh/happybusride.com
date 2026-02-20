"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";

type LayoutConfig = {
  rows: number;
  columns: string[];
  decks?: string[];
};

interface SeatLayoutBuilderProps {
  busId: string;
  busType: string;
  initialLayout?: LayoutConfig;
  onSave?: (layout: LayoutConfig, seatsCreated: number) => void;
}

const isSleeper = (busType: string) => busType.includes("SLEEPER");

export function SeatLayoutBuilder({ busId, busType, initialLayout, onSave }: SeatLayoutBuilderProps) {
  const defaultLayout: LayoutConfig = initialLayout ?? {
    rows: isSleeper(busType) ? 9 : 10,
    columns: isSleeper(busType) ? ["A", "_", "B", "C"] : ["A", "B", "_", "C", "D"],
    decks: isSleeper(busType) ? ["lower", "upper"] : ["lower"],
  };

  const [layout, setLayout] = useState<LayoutConfig>(defaultLayout);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const seatCount = layout.rows *
    layout.columns.filter((c) => c !== "_").length *
    (layout.decks?.length ?? 1);

  const addColumn = useCallback(() => {
    const existing = layout.columns.filter((c) => c !== "_");
    const next = String.fromCharCode(65 + existing.length);
    setLayout((l) => ({ ...l, columns: [...l.columns, next] }));
  }, [layout.columns]);

  const removeColumn = useCallback((idx: number) => {
    setLayout((l) => ({ ...l, columns: l.columns.filter((_, i) => i !== idx) }));
  }, []);

  const toggleAisle = useCallback((idx: number) => {
    setLayout((l) => ({
      ...l,
      columns: l.columns.map((c, i) => (i === idx ? (c === "_" ? String.fromCharCode(65 + l.columns.filter((x, j) => x !== "_" && j < idx).length) : "_") : c)),
    }));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/operator/buses/${busId}/layout`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layout),
      });
      if (res.ok) {
        const data = await res.json();
        setSaved(true);
        onSave?.(layout, data.seatsCreated);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert("Failed to save layout");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Seat Layout Builder</h2>
          <p className="text-sm text-gray-500">{seatCount} seats total</p>
        </div>
        <Button variant="primary" loading={saving} onClick={handleSave}>
          {saved ? "✓ Saved!" : "Save Layout"}
        </Button>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Rows</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLayout((l) => ({ ...l, rows: Math.max(1, l.rows - 1) }))}
              className="h-8 w-8 rounded border border-gray-300 text-center text-sm hover:bg-gray-50"
            >−</button>
            <span className="w-8 text-center text-sm font-medium">{layout.rows}</span>
            <button
              onClick={() => setLayout((l) => ({ ...l, rows: Math.min(20, l.rows + 1) }))}
              className="h-8 w-8 rounded border border-gray-300 text-center text-sm hover:bg-gray-50"
            >+</button>
          </div>
        </div>

        {isSleeper(busType) && (
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Decks</label>
            <div className="flex gap-2">
              {["lower", "upper"].map((deck) => (
                <button
                  key={deck}
                  onClick={() => {
                    const decks = layout.decks ?? ["lower"];
                    setLayout((l) => ({
                      ...l,
                      decks: decks.includes(deck)
                        ? decks.filter((d) => d !== deck)
                        : [...decks, deck],
                    }));
                  }}
                  className={`rounded px-3 py-1 text-xs font-medium capitalize ${
                    (layout.decks ?? ["lower"]).includes(deck)
                      ? "bg-blue-600 text-white"
                      : "border border-gray-300 text-gray-600"
                  }`}
                >
                  {deck}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Column editor */}
      <div className="mb-4">
        <label className="mb-2 block text-xs font-medium text-gray-600">Columns (click to toggle aisle)</label>
        <div className="flex items-center gap-1">
          {layout.columns.map((col, idx) => (
            <div key={idx} className="relative">
              <button
                onClick={() => toggleAisle(idx)}
                className={`h-10 w-10 rounded text-xs font-medium transition-colors ${
                  col === "_"
                    ? "bg-gray-100 text-gray-400"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-blue-50"
                }`}
                title={col === "_" ? "Aisle (click to make seat)" : "Seat column (click to make aisle)"}
              >
                {col === "_" ? "│" : col}
              </button>
              {layout.columns.length > 2 && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeColumn(idx); }}
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-xs group-hover:flex"
                >×</button>
              )}
            </div>
          ))}
          <button
            onClick={addColumn}
            className="ml-1 h-10 w-10 rounded border border-dashed border-gray-300 text-xl text-gray-400 hover:border-blue-400 hover:text-blue-500"
          >+</button>
        </div>
        <p className="mt-1 text-xs text-gray-400">Gray columns (│) = aisle. Lettered = seat column.</p>
      </div>

      {/* Preview */}
      {(layout.decks ?? ["lower"]).map((deck) => (
        <div key={deck} className="mb-4">
          {(layout.decks ?? ["lower"]).length > 1 && (
            <p className="mb-2 text-xs font-semibold uppercase text-gray-500">{deck} deck</p>
          )}
          <div className="overflow-x-auto">
            <div className="inline-block">
              {/* Driver row */}
              <div className="mb-2 flex items-center gap-1">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-200 text-xs text-gray-500">🚌</div>
                {layout.columns.map((col, idx) => (
                  <div
                    key={idx}
                    className={`h-8 w-8 ${col === "_" ? "" : "rounded-sm bg-gray-300"}`}
                  />
                ))}
              </div>
              {/* Seat rows */}
              {Array.from({ length: layout.rows }, (_, row) => (
                <div key={row} className="mb-1 flex items-center gap-1">
                  <div className="w-8 text-right text-xs text-gray-400">{row + 1}</div>
                  {layout.columns.map((col, idx) => (
                    <div
                      key={idx}
                      className={`h-8 w-8 rounded-sm text-xs ${
                        col === "_"
                          ? "bg-transparent"
                          : "border border-gray-300 bg-green-100 flex items-center justify-center text-green-700 font-medium"
                      }`}
                    >
                      {col !== "_" && `${row + 1}${col}`}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <div className="mt-4 flex gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="h-4 w-4 rounded-sm border border-gray-300 bg-green-100" />
          Available seat
        </div>
      </div>
    </div>
  );
}
