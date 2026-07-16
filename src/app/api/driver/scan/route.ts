import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const scanSchema = z.object({
  tripId: z.string().min(1),
  pnr: z.string().min(1),
  // Present when scanned from the ticket QR; absent for manual PNR entry.
  token: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "DRIVER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { tripId, pnr, token } = scanSchema.parse(body);

  // Verify this driver owns the trip
  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      driver: { userId: session.user.id },
    },
    include: {
      schedule: {
        select: {
          route: {
            select: {
              name: true,
              fromCity: { select: { name: true } },
              toCity: { select: { name: true } },
              stops: { select: { id: true, stopName: true, city: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  if (!trip) {
    return NextResponse.json({ error: "Trip not found or not assigned to you" }, { status: 403 });
  }

  // Find booking by PNR + tripId
  const booking = await prisma.booking.findFirst({
    where: {
      // PNRs are cuids (lowercase) but tickets/drivers may render them
      // uppercased — match case-insensitively.
      pnr: { equals: pnr, mode: "insensitive" },
      tripId,
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    include: {
      user: { select: { name: true, phone: true } },
      passengers: true,
      seats: { include: { seat: { select: { id: true, seatNumber: true } } } },
    },
  });

  if (!booking) {
    return NextResponse.json({ valid: false, message: "Invalid PNR or ticket is for a different trip" });
  }

  // A QR scan must carry the booking's secret token — rejects forged QRs
  // that only guessed a PNR. Manual entry (no token) skips this check.
  if (token !== undefined && token !== booking.qrToken) {
    return NextResponse.json({ valid: false, message: "QR code is not authentic — verify the PNR manually" });
  }

  const route = trip.schedule.route;
  const stopLabel = (stopId: string | null) => {
    if (!stopId) return null;
    const s = route.stops.find((x) => x.id === stopId);
    return s ? `${s.stopName} (${s.city.name})` : null;
  };

  const seatById = new Map(booking.seats.map((s) => [s.seat.id, s.seat.seatNumber]));

  return NextResponse.json({
    valid: true,
    verifiedByToken: token !== undefined,
    pnr: booking.pnr,
    status: booking.status,
    passengerName: booking.user?.name ?? "Unknown",
    phone: booking.user?.phone ?? "",
    travelDate: trip.travelDate.toISOString().slice(0, 10),
    routeName: route.name,
    // Full route endpoints as fallback for whole-route/legacy bookings
    boardingStop: stopLabel(booking.boardingStopId) ?? route.fromCity.name,
    droppingStop: stopLabel(booking.droppingStopId) ?? route.toCity.name,
    seats: booking.seats.map((s) => s.seat?.seatNumber).filter(Boolean),
    passengers: booking.passengers.map((p) => ({
      name: p.name,
      age: p.age,
      gender: p.gender,
      seatNumber: seatById.get(p.seatId) ?? null,
    })),
  });
}
