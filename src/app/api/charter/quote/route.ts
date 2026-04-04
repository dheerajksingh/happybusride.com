import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { differenceInCalendarDays } from "date-fns";

const schema = z.object({
  busId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  estimatedKm: z.number().positive(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const bus = await prisma.bus.findUnique({ where: { id: data.busId } });
    if (!bus) return NextResponse.json({ error: "Bus not found" }, { status: 404 });
    if (!bus.isCharterAvailable) return NextResponse.json({ error: "Bus not available for charter" }, { status: 400 });
    if (!bus.charterRatePerDay || !bus.charterRatePerKm || !bus.charterDepositPercent) {
      return NextResponse.json({ error: "Charter rates not configured for this bus" }, { status: 400 });
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end < start) return NextResponse.json({ error: "End date must be after start date" }, { status: 400 });

    const numDays = differenceInCalendarDays(end, start) + 1;
    const ratePerDay = Number(bus.charterRatePerDay);
    const ratePerKm = Number(bus.charterRatePerKm);
    const depositPercent = bus.charterDepositPercent;

    const totalAmount = numDays * ratePerDay + data.estimatedKm * ratePerKm;
    const depositAmount = Math.ceil((totalAmount * depositPercent) / 100);

    return NextResponse.json({
      numDays,
      ratePerDay,
      ratePerKm,
      depositPercent,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      depositAmount,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
