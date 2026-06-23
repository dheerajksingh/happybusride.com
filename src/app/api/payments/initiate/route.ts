import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getMobileSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { calculateFare, calculateCommission } from "@/lib/fare";
import { initiatePayment } from "@/lib/payment";
import { resolveSegment, segmentFare, segmentsOverlap, bookingInterval } from "@/lib/segment";

const addonSchema = z.object({
  address: z.string().min(1),
  cityId: z.string().min(1),
  price: z.number().min(0),
}).optional();

const schema = z.object({
  tripId: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(["WALLET", "UPI", "CARD", "CASH"]),
  seatIds: z.array(z.string()).min(1).max(6),
  passengers: z.array(z.object({
    name: z.string().min(1),
    age: z.number().min(1).max(120),
    gender: z.string(),
    seatId: z.string(),
  })),
  extraLuggageWeightKg: z.number().optional(),
  extraLuggageCharge: z.number().optional(),
  boardingStopId: z.string().optional(),
  droppingStopId: z.string().optional(),
  shuttlePickup: addonSchema,
  shuttleDropoff: addonSchema,
  cabPickup: addonSchema,
  cabDropoff: addonSchema,
});

export async function POST(req: Request) {
  try {
    const session = (await auth()) ?? (await getMobileSession(req));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = schema.parse(body);

    const trip = await prisma.trip.findUnique({
      where: { id: data.tripId },
      include: {
        schedule: {
          include: {
            bus: { include: { operator: true } },
            route: { include: { stops: { orderBy: { stopOrder: "asc" } } } },
            fareRules: {
              where: { isActive: true },
              include: { fromStop: { select: { cityId: true } }, toStop: { select: { cityId: true } } },
            },
          },
        },
      },
    });

    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    // Verify seat locks belong to this user
    const locks = await prisma.seatLock.findMany({
      where: {
        tripId: data.tripId,
        seatId: { in: data.seatIds },
        userId: session.user.id,
        expiresAt: { gte: new Date() },
      },
    });

    if (locks.length !== data.seatIds.length) {
      return NextResponse.json({ error: "Seat reservation expired. Please select seats again." }, { status: 409 });
    }

    // Authoritative per-segment fare (server doesn't trust client-sent amounts).
    const seg = resolveSegment(trip.schedule.route.stops, {
      boardingStopId: data.boardingStopId,
      droppingStopId: data.droppingStopId,
    });

    // Reject a degenerate/inverted segment — otherwise its empty interval would
    // overlap nothing and silently bypass the overselling guard.
    if (seg.boardingOrder >= seg.droppingOrder) {
      return NextResponse.json({ error: "Invalid boarding/dropping stops." }, { status: 400 });
    }
    const perSeatFare = segmentFare(
      Number(trip.schedule.baseFare),
      trip.schedule.route.distanceKm ?? 0,
      trip.schedule.route.stops,
      seg,
      trip.schedule.fareRules,
    );
    const fare = calculateFare(perSeatFare, data.seatIds.length);

    const shuttlePickupPrice = data.shuttlePickup?.price ?? 0;
    const shuttleDropoffPrice = data.shuttleDropoff?.price ?? 0;
    const cabPickupPrice = data.cabPickup?.price ?? 0;
    const cabDropoffPrice = data.cabDropoff?.price ?? 0;
    const extraLuggageCharge = data.extraLuggageCharge ?? 0;
    const finalTotal = fare.totalAmount + extraLuggageCharge + shuttlePickupPrice + shuttleDropoffPrice + cabPickupPrice + cabDropoffPrice;

    const bookingData = {
      userId: session.user.id,
      tripId: data.tripId,
      status: "PENDING" as const,
      baseFare: fare.baseFare,
      gstAmount: fare.gstAmount,
      convenienceFee: fare.convenienceFee,
      discount: fare.discount,
      totalAmount: finalTotal,
      boardingStopId: seg.boardingStop.id,
      droppingStopId: seg.droppingStop.id,
      boardingStopOrder: seg.boardingOrder,
      droppingStopOrder: seg.droppingOrder,
      ...(data.extraLuggageWeightKg ? { extraLuggageWeightKg: data.extraLuggageWeightKg } : {}),
      ...(data.extraLuggageCharge ? { extraLuggageCharge: data.extraLuggageCharge } : {}),
      passengers: {
        create: data.passengers.map((p) => ({
          name: p.name,
          age: p.age,
          gender: p.gender,
          seatId: p.seatId,
        })),
      },
      seats: {
        create: data.seatIds.map((seatId) => ({ seatId, tripId: data.tripId })),
      },
      ...(data.shuttlePickup || data.shuttleDropoff ? {
        shuttleBookings: {
          create: [
            ...(data.shuttlePickup ? [{
              type: "PICKUP" as const,
              address: data.shuttlePickup.address,
              cityId: data.shuttlePickup.cityId,
              price: data.shuttlePickup.price,
              status: "PENDING" as const,
            }] : []),
            ...(data.shuttleDropoff ? [{
              type: "DROPOFF" as const,
              address: data.shuttleDropoff.address,
              cityId: data.shuttleDropoff.cityId,
              price: data.shuttleDropoff.price,
              status: "PENDING" as const,
            }] : []),
          ],
        },
      } : {}),
      ...(data.cabPickup || data.cabDropoff ? {
        cabBookings: {
          create: [
            ...(data.cabPickup ? [{
              type: "PICKUP" as const,
              address: data.cabPickup.address,
              cityId: data.cabPickup.cityId,
              price: data.cabPickup.price,
              status: "PENDING" as const,
            }] : []),
            ...(data.cabDropoff ? [{
              type: "DROPOFF" as const,
              address: data.cabDropoff.address,
              cityId: data.cabDropoff.cityId,
              price: data.cabDropoff.price,
              status: "PENDING" as const,
            }] : []),
          ],
        },
      } : {}),
    };

    const stops = trip.schedule.route.stops;

    // Create the booking with a final overlap re-check, Serializable so two
    // concurrent bookings on overlapping segments of the same seat can't both
    // commit. This is the real overselling guard — we don't trust that the lock
    // was acquired for the same segment now being booked.
    const createBooking = () =>
      prisma.$transaction(async (tx) => {
        const occupied = await tx.bookingsSeat.findMany({
          where: {
            tripId: data.tripId,
            seatId: { in: data.seatIds },
            booking: { status: { notIn: ["CANCELLED_USER", "CANCELLED_OPERATOR", "REFUNDED"] } },
          },
          select: {
            seatId: true,
            booking: { select: { boardingStopId: true, droppingStopId: true, boardingStopOrder: true, droppingStopOrder: true } },
          },
        });
        for (const o of occupied) {
          const iv = bookingInterval(stops, o.booking);
          if (segmentsOverlap(seg.boardingOrder, seg.droppingOrder, iv.board, iv.drop)) {
            return { conflict: true as const };
          }
        }
        const booking = await tx.booking.create({ data: bookingData });
        return { conflict: false as const, booking };
      }, { isolationLevel: "Serializable" });

    let result;
    try {
      result = await createBooking();
    } catch (err: any) {
      if (err?.code === "P2034") {
        try { result = await createBooking(); } catch { result = { conflict: true as const }; }
      } else {
        throw err;
      }
    }

    if (result.conflict || !result.booking) {
      return NextResponse.json(
        { error: "One or more seats are no longer available for this segment." },
        { status: 409 }
      );
    }
    const booking = result.booking;

    // Initiate mock payment
    const payment = await initiatePayment(booking.id, finalTotal, data.method);

    // Create payment record
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: finalTotal,
        method: data.method,
        status: "PENDING",
        gatewayTxnId: payment.gatewayTxnId,
      },
    });

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      paymentId: payment.paymentId,
      amount: finalTotal,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
