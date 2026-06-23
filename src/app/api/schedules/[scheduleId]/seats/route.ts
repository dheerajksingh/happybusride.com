import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveSegment, segmentFare, segmentsOverlap, occupantInterval, bookingInterval } from "@/lib/segment";
import { expireStalePendingBookings } from "@/lib/seat-lock";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const fromCityId = searchParams.get("from");
    const toCityId = searchParams.get("to");

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
        fareRules: {
          where: { isActive: true },
          include: { fromStop: { select: { cityId: true } }, toStop: { select: { cityId: true } } },
        },
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

    // Resolve the requested segment + its per-seat fare.
    const stops = schedule.route.stops;
    const seg = resolveSegment(stops, { fromCityId, toCityId });
    const totalDistance = schedule.route.distanceKm ?? 0;
    const fare = segmentFare(Number(schedule.baseFare), totalDistance, stops, seg, schedule.fareRules);

    // Free seats held by abandoned checkouts before computing availability.
    await expireStalePendingBookings(trip.id);

    // Active bookings (with their segments) and unexpired locks.
    const bookedSeats = await prisma.bookingsSeat.findMany({
      where: { tripId: trip.id, booking: { status: { notIn: ["CANCELLED_USER", "CANCELLED_OPERATOR", "REFUNDED"] } } },
      select: {
        seatId: true,
        booking: { select: { boardingStopId: true, droppingStopId: true, boardingStopOrder: true, droppingStopOrder: true } },
      },
    });

    await prisma.seatLock.deleteMany({
      where: { tripId: trip.id, expiresAt: { lt: new Date() } },
    });

    const lockedSeats = await prisma.seatLock.findMany({
      where: { tripId: trip.id, expiresAt: { gte: new Date() } },
      select: { seatId: true, userId: true, expiresAt: true, boardingStopId: true, droppingStopId: true },
    });

    // A seat is unavailable for THIS segment only if an occupant's segment overlaps it.
    const bookedIds = new Set<string>();
    for (const b of bookedSeats) {
      const iv = bookingInterval(stops, b.booking);
      if (segmentsOverlap(seg.boardingOrder, seg.droppingOrder, iv.board, iv.drop)) bookedIds.add(b.seatId);
    }
    const lockedMap = new Map<string, { userId: string; expiresAt: Date }>();
    for (const l of lockedSeats) {
      const iv = occupantInterval(stops, l.boardingStopId, l.droppingStopId);
      if (segmentsOverlap(seg.boardingOrder, seg.droppingOrder, iv.board, iv.drop) && !lockedMap.has(l.seatId)) {
        lockedMap.set(l.seatId, { userId: l.userId, expiresAt: l.expiresAt });
      }
    }

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
      baseFare: fare,                       // per-seat fare for the requested segment
      fullRouteFare: Number(schedule.baseFare),
      boardingStopId: seg.boardingStop.id,
      droppingStopId: seg.droppingStop.id,
      fareRules: schedule.fareRules,
      seats,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
