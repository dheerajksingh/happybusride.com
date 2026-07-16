import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SeatType } from "@prisma/client";
import { addDays, startOfDay } from "date-fns";
import { parseISTDateTime } from "@/lib/ist";

const scheduleSchema = z.object({
  routeId: z.string().min(1),
  busId: z.string().min(1),
  driverId: z.string({ error: "Driver is required" }).min(1, "Driver is required"),
  departureTime: z.string(),
  arrivalTime: z.string(),
  baseFare: z.number().positive(),
  recurrence: z.string().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  fareRules: z.array(z.object({ seatType: z.string(), price: z.number() })).optional(),
  freightSpaces: z.array(z.object({
    label: z.string(),
    lengthCm: z.number(),
    widthCm: z.number(),
    heightCm: z.number(),
  })).optional(),
  stopOffsets: z.array(z.object({
    stopId: z.string(),
    arrivalOffset: z.number().int().min(0),
    departureOffset: z.number().int().min(0),
  })).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json([]);

  const schedules = await prisma.schedule.findMany({
    where: { bus: { operatorId: operator.id } },
    include: {
      route: { include: { fromCity: true, toCity: true } },
      bus: { select: { name: true, busType: true } },
      driver: { include: { user: { select: { name: true } } } },
      _count: { select: { trips: true } },
    },
    orderBy: { departureTime: "asc" },
  });

  return NextResponse.json(schedules);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  try {
    const body = await req.json();
    const { fareRules, daysOfWeek, freightSpaces, driverId, stopOffsets, ...data } = scheduleSchema.parse(body);

    // Driver must exist and belong to this operator
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, operatorId: operator.id },
    });
    if (!driver) {
      return NextResponse.json({ error: "Select a valid driver" }, { status: 400 });
    }

    const schedule = await prisma.schedule.create({
      data: {
        ...data,
        driverId,
        departureTime: parseISTDateTime(data.departureTime),
        arrivalTime: parseISTDateTime(data.arrivalTime),
        daysOfWeek: daysOfWeek ?? [],
        freightSpaces: freightSpaces ?? undefined,
        fareRules: fareRules ? { create: fareRules.map((r) => ({ ...r, seatType: r.seatType as SeatType })) } : undefined,
      },
    });

    // Auto-generate trips starting from tomorrow for next 30 days
    const dow = daysOfWeek ?? [];
    const tripData = [];
    for (let d = 1; d <= 30; d++) {
      const travelDate = startOfDay(addDays(new Date(), d));
      if (dow.length > 0 && !dow.includes(travelDate.getDay())) continue;
      tripData.push({ scheduleId: schedule.id, travelDate, driverId, status: "SCHEDULED" as const });
    }
    await prisma.trip.createMany({ data: tripData, skipDuplicates: true });

    // Save stop time offsets back to route_stops
    if (stopOffsets && stopOffsets.length > 0) {
      await Promise.all(stopOffsets.map((s) =>
        prisma.routeStop.update({
          where: { id: s.stopId },
          data: { arrivalOffset: s.arrivalOffset, departureOffset: s.departureOffset },
        })
      ));
    }

    return NextResponse.json(schedule, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error("[operator/schedules POST]", err);
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }
}
