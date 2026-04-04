import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getMobileSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";
import { differenceInCalendarDays } from "date-fns";

const schema = z.object({
  busId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  estimatedKm: z.number().positive(),
  passengerCount: z.number().min(1).max(60).default(1),
  purpose: z.string().optional(),
  pickupAddress: z.string().optional(),
  dropAddress: z.string().optional(),
  routeWaypoints: z.array(z.object({ lat: z.number(), lng: z.number(), label: z.string().optional() })).optional(),
  paymentMethod: z.enum(["WALLET", "UPI", "CARD"]),
});

export async function POST(req: Request) {
  try {
    const session = (await auth()) ?? (await getMobileSession(req));
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = schema.parse(body);

    const bus = await prisma.bus.findUnique({ where: { id: data.busId } });
    if (!bus) return NextResponse.json({ error: "Bus not found" }, { status: 404 });
    if (!bus.isCharterAvailable || !bus.isActive) {
      return NextResponse.json({ error: "Bus not available for charter" }, { status: 400 });
    }
    if (!bus.charterRatePerDay || !bus.charterRatePerKm || !bus.charterDepositPercent) {
      return NextResponse.json({ error: "Charter rates not configured" }, { status: 400 });
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });

    const numDays = differenceInCalendarDays(end, start) + 1;
    const ratePerDay = Number(bus.charterRatePerDay);
    const ratePerKm = Number(bus.charterRatePerKm);
    const depositPercent = bus.charterDepositPercent;

    const totalAmount = parseFloat((numDays * ratePerDay + data.estimatedKm * ratePerKm).toFixed(2));
    const depositAmount = Math.ceil((totalAmount * depositPercent) / 100);

    const booking = await prisma.charterBooking.create({
      data: {
        userId: session.user.id,
        busId: data.busId,
        status: "PENDING_DEPOSIT",
        startDate: start,
        endDate: end,
        numDays,
        estimatedKm: data.estimatedKm,
        ratePerDay,
        ratePerKm,
        depositPercent,
        depositAmount,
        totalAmount,
        pickupAddress: data.pickupAddress,
        dropAddress: data.dropAddress,
        routeWaypoints: data.routeWaypoints ?? [],
        passengerCount: data.passengerCount,
        purpose: data.purpose,
      },
    });

    await prisma.charterPayment.create({
      data: {
        charterBookingId: booking.id,
        amount: depositAmount,
        method: data.paymentMethod,
        status: "PENDING",
        gatewayTxnId: `mock_${Date.now()}`,
      },
    });

    return NextResponse.json({ success: true, bookingId: booking.id }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
