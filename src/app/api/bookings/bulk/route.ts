import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateFare } from "@/lib/fare";
import { z } from "zod";

const schema = z.object({
  tripId: z.string().min(1),
  seatIds: z.array(z.string()).min(1).max(50),
  passengers: z.array(z.object({
    name: z.string().min(1),
    age: z.coerce.number().min(1).max(120),
    gender: z.string(),
    seatId: z.string(),
  })),
  isBulkAgent: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = schema.parse(body);

    if (data.seatIds.length !== data.passengers.length) {
      return NextResponse.json({ error: "Seat count must match passenger count" }, { status: 400 });
    }

    const [trip, agentConfig] = await Promise.all([
      prisma.trip.findUnique({
        where: { id: data.tripId },
        include: { schedule: { include: { bus: true, route: true } } },
      }),
      data.isBulkAgent
        ? prisma.agentChargeConfig.findFirst({ where: { isActive: true } })
        : null,
    ]);
    if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

    const agent = data.isBulkAgent
      ? await prisma.agent.findUnique({ where: { userId: session.user.id } })
      : null;

    const result = await prisma.$transaction(async (tx) => {
      // Check seat availability
      const taken = await tx.bookingsSeat.findMany({
        where: { tripId: data.tripId, seatId: { in: data.seatIds } },
        select: { seatId: true },
      });

      if (taken.length > 0) {
        throw new Error(`Seats already booked: ${taken.map(t => t.seatId).join(", ")}`);
      }

      const fare = calculateFare(Number(trip.schedule.baseFare), data.seatIds.length);

      const group = await tx.bulkBookingGroup.create({
        data: {
          type: data.isBulkAgent ? "AGENT" : "PASSENGER",
          initiatedBy: session.user.id,
          notes: data.notes ?? null,
        },
      });

      const booking = await tx.booking.create({
        data: {
          userId: session.user.id,
          tripId: data.tripId,
          // Agent walk-in bookings are paid in cash on the spot — confirm immediately.
          status: data.isBulkAgent ? "CONFIRMED" : "PENDING",
          baseFare: fare.baseFare,
          gstAmount: fare.gstAmount,
          convenienceFee: fare.convenienceFee,
          discount: fare.discount,
          totalAmount: fare.totalAmount,
          bulkGroupId: group.id,
          passengers: {
            create: data.passengers.map(p => ({
              name: p.name,
              age: p.age,
              gender: p.gender,
              seatId: p.seatId,
            })),
          },
          seats: {
            create: data.seatIds.map(seatId => ({ seatId, tripId: data.tripId })),
          },
        },
      });

      if (data.isBulkAgent && agent) {
        const commPct = Number(agentConfig?.agentSeatBookingComm ?? 0) / 100;
        await tx.agentPassengerBooking.create({
          data: {
            agentId: agent.id,
            bookingId: booking.id,
            commission: Number(fare.totalAmount) * commPct,
          },
        });
      }

      return { group, booking };
    });

    // Fetch full ticket data for the confirmation screen
    const fullBooking = await prisma.booking.findUnique({
      where: { id: result.booking.id },
      include: {
        passengers: true,
        seats: { include: { seat: { select: { seatNumber: true } } } },
        trip: {
          include: {
            schedule: {
              include: {
                route: {
                  include: {
                    fromCity: { select: { name: true } },
                    toCity: { select: { name: true } },
                  },
                },
                bus: {
                  select: { name: true, busType: true, registrationNo: true, operator: { select: { companyName: true } } },
                },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      groupId: result.group.id,
      bookingId: result.booking.id,
      pnr: result.booking.pnr,
      qrToken: fullBooking?.qrToken,
      totalAmount: result.booking.totalAmount,
      ticket: fullBooking,
    }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    if (err.message?.includes("Seats already booked")) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
