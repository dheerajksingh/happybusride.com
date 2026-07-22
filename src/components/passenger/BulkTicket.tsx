"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { generateQRDataURL, buildTicketQRData } from "@/lib/qr";

interface BulkTicketProps {
  pnr: string;
  qrToken: string;
  totalAmount: number;
  ticket: {
    status: string;
    passengers: { name: string; age: number; gender: string }[];
    seats: { seat: { seatNumber: string } }[];
    trip: {
      travelDate: string;
      schedule: {
        departureTime: string;
        arrivalTime: string;
        route: {
          name: string;
          fromCity: { name: string };
          toCity: { name: string };
        };
        bus: {
          name: string;
          busType: string;
          registrationNo: string;
          operator?: { companyName: string } | null;
        };
      };
    };
  };
}

export function BulkTicket({ pnr, qrToken, totalAmount, ticket }: BulkTicketProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const { trip } = ticket;
  const { schedule } = trip;
  const { route, bus } = schedule;

  const travelDate = new Date(trip.travelDate);
  const depTime = new Date(schedule.departureTime);
  const arrTime = new Date(schedule.arrivalTime);

  const dep = new Date(
    travelDate.getUTCFullYear(), travelDate.getUTCMonth(), travelDate.getUTCDate(),
    depTime.getUTCHours(), depTime.getUTCMinutes(),
  );
  const arr = new Date(
    travelDate.getUTCFullYear(), travelDate.getUTCMonth(), travelDate.getUTCDate(),
    arrTime.getUTCHours(), arrTime.getUTCMinutes(),
  );
  if (arrTime.getUTCHours() * 60 + arrTime.getUTCMinutes() < depTime.getUTCHours() * 60 + depTime.getUTCMinutes()) {
    arr.setDate(arr.getDate() + 1);
  }

  const seatNums = ticket.seats.map((s) => s.seat.seatNumber).sort().join(", ");
  const paxCount = ticket.passengers.length;

  useEffect(() => {
    generateQRDataURL(
      buildTicketQRData({
        pnr,
        qrToken,
        travellerName: `GROUP (${paxCount} pax)`,
        travelDate: trip.travelDate.slice(0, 10),
        from: route.fromCity.name,
        to: route.toCity.name,
        seats: seatNums,
        routeName: route.name,
        operatorName: bus.operator?.companyName ?? "",
      })
    ).then(setQrDataUrl);
  }, [pnr, qrToken, paxCount, trip.travelDate, route, bus, seatNums]);

  function handlePrint() {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Ticket ${pnr}</title>
      <style>
        body { font-family: sans-serif; margin: 0; padding: 16px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; font-size: 13px; }
        th { background: #f3f4f6; font-weight: 600; }
        .header { background: #2563eb; color: white; padding: 16px; border-radius: 8px 8px 0 0; }
        .section { padding: 12px 16px; }
        .label { font-size: 11px; color: #9ca3af; }
        .value { font-weight: 600; }
        img { display: block; margin: 0 auto; }
        @media print { button { display: none; } }
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <div className="mx-auto max-w-lg">
      <div ref={printRef} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">HappyBusRide · Group Ticket</p>
              <h2 className="mt-0.5 text-2xl font-bold">{pnr.slice(0, 8).toUpperCase()}</h2>
              <p className="text-xs opacity-70">PNR: {pnr}</p>
            </div>
            <div className="rounded-full bg-green-500 px-3 py-1 text-xs font-bold uppercase">Confirmed</div>
          </div>
        </div>

        {/* Route */}
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-2xl font-bold text-gray-900">{format(dep, "HH:mm")}</p>
            <p className="text-sm font-semibold text-gray-700">{route.fromCity.name}</p>
          </div>
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <div className="flex items-center gap-1">
              <div className="h-px w-12 bg-gray-200" />
              <span>🚌</span>
              <div className="h-px w-12 bg-gray-200" />
            </div>
            <p className="text-xs font-medium text-gray-500">{format(travelDate, "EEE, d MMM yyyy")}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{format(arr, "HH:mm")}</p>
            <p className="text-sm font-semibold text-gray-700">{route.toCity.name}</p>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-200" />

        {/* Bus info */}
        <div className="grid grid-cols-3 gap-3 px-6 py-3 text-sm">
          <div>
            <p className="text-xs text-gray-400">Bus</p>
            <p className="font-semibold text-gray-900">{bus.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Reg. No.</p>
            <p className="font-semibold text-gray-900">{bus.registrationNo}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Seats</p>
            <p className="font-semibold text-gray-900">{seatNums}</p>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-200" />

        {/* Passenger list */}
        <div className="px-6 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Passengers ({paxCount})
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                <th className="pb-1 pr-3 font-semibold">#</th>
                <th className="pb-1 pr-3 font-semibold">Name</th>
                <th className="pb-1 pr-3 font-semibold">Age</th>
                <th className="pb-1 font-semibold">Gender</th>
              </tr>
            </thead>
            <tbody>
              {ticket.passengers.map((p, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-1 pr-3 text-gray-400">{i + 1}</td>
                  <td className="py-1 pr-3 font-medium text-gray-900">{p.name}</td>
                  <td className="py-1 pr-3 text-gray-600">{p.age}</td>
                  <td className="py-1 text-gray-600">{p.gender === "M" ? "Male" : p.gender === "F" ? "Female" : p.gender}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-dashed border-gray-200" />

        {/* Total + QR */}
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs text-gray-400">Total Amount</p>
            <p className="text-2xl font-bold text-gray-900">₹{Number(totalAmount).toLocaleString("en-IN")}</p>
            <p className="text-xs text-gray-400">Cash collected</p>
          </div>
          <div className="flex flex-col items-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="h-28 w-28" />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-gray-100">
                <span className="text-xs text-gray-400">Loading…</span>
              </div>
            )}
            <p className="mt-1 text-xs text-gray-400">Show to conductor</p>
          </div>
        </div>
      </div>

      {/* Print button */}
      <button
        onClick={handlePrint}
        className="mt-4 w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Print Ticket
      </button>
    </div>
  );
}
