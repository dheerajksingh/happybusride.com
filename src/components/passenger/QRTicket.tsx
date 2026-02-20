"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { generateQRDataURL, buildTicketQRData } from "@/lib/qr";
import { BUS_TYPE_LABELS } from "@/constants/config";
import { bookingStatusBadge } from "@/components/ui/Badge";

interface BookingData {
  id: string;
  pnr: string;
  qrToken: string;
  status: string;
  totalAmount: number;
  baseFare: number;
  gstAmount: number;
  convenienceFee: number;
  passengers: { name: string; age: number; gender: string; seatId: string }[];
  seats: { seat: { seatNumber: string } }[];
  trip: {
    travelDate: string;
    schedule: {
      departureTime: string;
      arrivalTime: string;
      route: {
        fromCity: { name: string };
        toCity: { name: string };
      };
      bus: { name: string; busType: string };
    };
  };
}

export function QRTicket({ booking }: { booking: BookingData }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    generateQRDataURL(
      buildTicketQRData({ id: booking.id, pnr: booking.pnr, qrToken: booking.qrToken })
    ).then(setQrDataUrl);
  }, [booking]);

  const dep = new Date(booking.trip.schedule.departureTime);
  const arr = new Date(booking.trip.schedule.arrivalTime);
  const seatNums = booking.seats.map((s) => s.seat.seatNumber).join(", ");

  return (
    <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg print:shadow-none">
      {/* Header */}
      <div className="bg-blue-600 px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider opacity-80">HappyBusRide</p>
            <h2 className="mt-0.5 text-2xl font-bold">{booking.pnr.slice(0, 8).toUpperCase()}</h2>
            <p className="text-xs opacity-70">PNR: {booking.pnr}</p>
          </div>
          <div className="text-right">{bookingStatusBadge(booking.status)}</div>
        </div>
      </div>

      {/* Route */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <p className="text-2xl font-bold text-gray-900">{format(dep, "HH:mm")}</p>
          <p className="text-sm font-medium text-gray-600">{booking.trip.schedule.route.fromCity.name}</p>
        </div>
        <div className="flex flex-col items-center gap-1 text-gray-400">
          <div className="flex items-center gap-1">
            <div className="h-px w-16 bg-gray-200" />
            <span>🚌</span>
            <div className="h-px w-16 bg-gray-200" />
          </div>
          <p className="text-xs">{format(new Date(booking.trip.travelDate), "EEE, d MMM yyyy")}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{format(arr, "HH:mm")}</p>
          <p className="text-sm font-medium text-gray-600">{booking.trip.schedule.route.toCity.name}</p>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-200" />

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 px-6 py-4 text-sm">
        <div>
          <p className="text-xs text-gray-400">Bus</p>
          <p className="font-medium text-gray-900">{booking.trip.schedule.bus.name}</p>
          <p className="text-xs text-gray-500">{BUS_TYPE_LABELS[booking.trip.schedule.bus.busType]}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Seats</p>
          <p className="font-medium text-gray-900">{seatNums}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Passengers</p>
          {booking.passengers.map((p, i) => (
            <p key={i} className="font-medium text-gray-900">{p.name} ({p.age})</p>
          ))}
        </div>
        <div>
          <p className="text-xs text-gray-400">Total Paid</p>
          <p className="text-lg font-bold text-gray-900">₹{Number(booking.totalAmount).toLocaleString()}</p>
        </div>
      </div>

      <div className="border-t border-dashed border-gray-200" />

      {/* QR Code */}
      <div className="flex flex-col items-center px-6 py-4">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="Ticket QR Code" className="h-40 w-40" />
        ) : (
          <div className="flex h-40 w-40 items-center justify-center rounded-lg bg-gray-100">
            <span className="text-gray-400">Loading QR...</span>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-400">Show this QR to the conductor</p>
      </div>
    </div>
  );
}
