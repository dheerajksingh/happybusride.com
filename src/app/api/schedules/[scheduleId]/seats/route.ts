import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }

    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        bus: {
          include: {
            seats: {
              where: { isActive: true },
              orderBy: [{ row: "asc" }, { column: "asc" }],
            },
          },
        },
        route: {
          include: {
            fromCity: { select: { name: true } },
            toCity: { select: { name: true } },
            stops: {
              include: { city: { select: { name: true } } },
              orderBy: { stopOrder: "asc" },
            },
          },
        },
        fareRules: { where: { isActive: true } },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    // Get or create trip for this date
    const travelDate = new Date(date);
    let trip = await prisma.trip.findUnique({
      where: { scheduleId_travelDate: { scheduleId, travelDate } },
    });

    if (!trip) {
      trip = await prisma.trip.create({
        data: { scheduleId, travelDate, status: "SCHEDULED" },
      });
    }

    // Get booked and locked seats
    const bookedSeats = await prisma.bookingsSeat.findMany({
      where: { tripId: trip.id },
      select: { seatId: true },
    });

    // Clean expired locks first
    await prisma.seatLock.deleteMany({
      where: { tripId: trip.id, expiresAt: { lt: new Date() } },
    });

    const lockedSeats = await prisma.seatLock.findMany({
      where: { tripId: trip.id },
      select: { seatId: true, userId: true, expiresAt: true },
    });

    const bookedIds = new Set(bookedSeats.map((s) => s.seatId));
    const lockedMap = new Map(lockedSeats.map((s) => [s.seatId, { userId: s.userId, expiresAt: s.expiresAt }]));

    // Build seat map
    const seats = schedule.bus.seats.map((seat) => ({
      id: seat.id,
      seatNumber: seat.seatNumber,
      seatType: seat.seatType,
      row: seat.row,
      column: seat.column,
      deck: seat.deck,
      status: bookedIds.has(seat.id) ? "BOOKED" : lockedMap.has(seat.id) ? "LOCKED" : "AVAILABLE",
      lockedBy: lockedMap.get(seat.id) ?? null,
    }));

    return NextResponse.json({
      scheduleId,
      tripId: trip.id,
      route: schedule.route,
      bus: {
        id: schedule.bus.id,
        name: schedule.bus.name,
        busType: schedule.bus.busType,
        layoutConfig: schedule.bus.layoutConfig,
        amenities: schedule.bus.amenities,
      },
      departureTime: schedule.departureTime,
      arrivalTime: schedule.arrivalTime,
      baseFare: schedule.baseFare,
      fareRules: schedule.fareRules,
      seats,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
