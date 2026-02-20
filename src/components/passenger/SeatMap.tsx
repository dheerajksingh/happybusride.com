"use client";

import { useEffect, useState } from "react";

interface Seat {
  id: string;
  seatNumber: string;
  seatType: string;
  row: number;
  column: string;
  deck: string;
  status: "AVAILABLE" | "BOOKED" | "LOCKED";
  lockedBy?: { userId: string; expiresAt: string } | null;
}

interface LayoutConfig {
  rows: number;
  columns: string[]; // e.g. ["A","B","_","C","D"]
  decks?: string[];
}

interface SeatMapProps {
  seats: Seat[];
  layoutConfig: LayoutConfig;
  selectedIds: string[];
  onToggle: (seatId: string) => void;
  currentUserId?: string;
  maxSelect?: number;
}

function getSeatColor(seat: Seat, selected: boolean, isMyLock: boolean): string {
  if (selected) return "bg-blue-600 text-white border-blue-600";
  if (seat.status === "BOOKED") return "bg-gray-300 text-gray-500 cursor-not-allowed border-gray-300";
  if (seat.status === "LOCKED" && !isMyLock) return "bg-yellow-200 text-yellow-700 cursor-not-allowed border-yellow-300";
  return "bg-green-100 text-green-700 border-green-400 hover:bg-green-200 cursor-pointer";
}

export function SeatMap({ seats, layoutConfig, selectedIds, onToggle, currentUserId, maxSelect = 6 }: SeatMapProps) {
  const [activeDeck, setActiveDeck] = useState("lower");

  const hasMultipleDecks = layoutConfig.decks && layoutConfig.decks.length > 1;
  const decks = hasMultipleDecks ? (layoutConfig.decks ?? ["lower"]) : ["lower"];

  const filteredSeats = seats.filter((s) => (hasMultipleDecks ? s.deck === activeDeck : true));

  // Build grid rows
  const rows: Record<number, Record<string, Seat | null>> = {};
  for (const seat of filteredSeats) {
    if (!rows[seat.row]) rows[seat.row] = {};
    rows[seat.row][seat.column] = seat;
  }

  const maxRow = Math.max(...filteredSeats.map((s) => s.row), 0);

  return (
    <div className="select-none">
      {hasMultipleDecks && (
        <div className="mb-4 flex gap-2">
          {decks.map((deck) => (
            <button
              key={deck}
              onClick={() => setActiveDeck(deck)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
                activeDeck === deck ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              {deck === "upper" ? "Upper Deck" : "Lower Deck"}
            </button>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded border border-green-400 bg-green-100" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded border-blue-600 bg-blue-600" /> Selected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded border border-gray-300 bg-gray-300" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-4 w-4 rounded border border-yellow-300 bg-yellow-200" /> Reserved
        </span>
      </div>

      {/* Driver icon at front */}
      <div className="mb-2 text-center text-2xl">🧑‍✈️ Front</div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-max rounded-xl border border-gray-200 bg-gray-50 p-4">
          {/* Column headers */}
          <div className="mb-2 flex gap-2">
            <div className="w-8 text-center text-xs text-gray-400">#</div>
            {layoutConfig.columns.map((col, i) =>
              col === "_" ? (
                <div key={i} className="w-8" />
              ) : (
                <div key={col} className="w-10 text-center text-xs font-semibold text-gray-500">{col}</div>
              )
            )}
          </div>

          {/* Seat rows */}
          {Array.from({ length: maxRow }, (_, i) => i + 1).map((row) => (
            <div key={row} className="mb-2 flex items-center gap-2">
              <div className="w-8 text-center text-xs text-gray-400">{row}</div>
              {layoutConfig.columns.map((col, ci) => {
                if (col === "_") return <div key={ci} className="w-8" />;

                const seat = rows[row]?.[col] ?? null;
                if (!seat) return <div key={col} className="w-10" />;

                const isSelected = selectedIds.includes(seat.id);
                const isMyLock = seat.status === "LOCKED" && seat.lockedBy?.userId === currentUserId;
                const canSelect = seat.status === "AVAILABLE" || isMyLock || isSelected;
                const colorClass = getSeatColor(seat, isSelected, isMyLock);

                return (
                  <button
                    key={seat.id}
                    onClick={() => {
                      if (!canSelect) return;
                      if (!isSelected && selectedIds.length >= maxSelect) return;
                      onToggle(seat.id);
                    }}
                    title={`Seat ${seat.seatNumber} - ${seat.status}`}
                    disabled={!canSelect && !isSelected}
                    className={`flex h-10 w-10 flex-col items-center justify-center rounded border text-xs font-medium transition-colors ${colorClass}`}
                  >
                    <span className="leading-none">{seat.seatNumber}</span>
                    {seat.seatType === "LOWER" && <span className="text-[8px] leading-none opacity-60">LWR</span>}
                    {seat.seatType === "UPPER" && <span className="text-[8px] leading-none opacity-60">UPR</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
