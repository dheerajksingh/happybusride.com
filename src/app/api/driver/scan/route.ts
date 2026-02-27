import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const scanSchema = z.object({
  tripId: z.string().min(1),
  pnr: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "DRIVER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { tripId, pnr } = scanSchema.parse(body);

  // Verify this driver owns the trip
  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      driver: { userId: session.user.id },
    },
  });

  if (!trip) {
    return NextResponse.json({ error: "Trip not found or not assigned to you" }, { status: 403 });
  }

  // Find booking by PNR + tripId
  const booking = await prisma.booking.findFirst({
    where: {
      pnr: pnr.toUpperCase(),
      tripId,
      status: { in: ["CONFIRMED", "COMPLETED"] },
    },
    include: {
      user: { select: { name: true, phone: true } },
      passengers: true,
      seats: { include: { seat: { select: { seatNumber: true } } } },
    },
  });

  if (!booking) {
    return NextResponse.json({ valid: false, message: "Invalid PNR or wrong trip" });
  }

  return NextResponse.json({
    valid: true,
    pnr: booking.pnr,
    status: booking.status,
    passengerName: booking.user?.name ?? "Unknown",
    phone: booking.user?.phone ?? "",
    seats: booking.seats.map((s) => s.seat?.seatNumber).filter(Boolean),
    passengers: booking.passengers.map((p) => ({
      name: p.name,
      age: p.age,
      gender: p.gender,
    })),
  });
}
