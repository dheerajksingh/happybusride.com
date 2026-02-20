import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SeatType } from "@prisma/client";
import { addDays, startOfDay } from "date-fns";

const scheduleSchema = z.object({
  routeId: z.string().min(1),
  busId: z.string().min(1),
  departureTime: z.string(),
  arrivalTime: z.string(),
  baseFare: z.number().positive(),
  recurrence: z.string().optional(),
  fareRules: z.array(z.object({ seatType: z.string(), price: z.number() })).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json([]);

  const schedules = await prisma.schedule.findMany({
    where: { route: { operatorId: operator.id } },
    include: {
      route: { include: { fromCity: true, toCity: true } },
      bus: { select: { name: true, busType: true } },
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

  const body = await req.json();
  const { fareRules, ...data } = scheduleSchema.parse(body);

  const schedule = await prisma.schedule.create({
    data: {
      ...data,
      departureTime: new Date(data.departureTime),
      arrivalTime: new Date(data.arrivalTime),
      fareRules: fareRules ? { create: fareRules.map((r) => ({ ...r, seatType: r.seatType as SeatType })) } : undefined,
    },
  });

  // Auto-generate trips for next 30 days
  const tripData = [];
  for (let d = 0; d <= 30; d++) {
    const travelDate = startOfDay(addDays(new Date(), d));
    tripData.push({ scheduleId: schedule.id, travelDate, status: "SCHEDULED" as const });
  }
  await prisma.trip.createMany({ data: tripData, skipDuplicates: true });

  return NextResponse.json(schedule, { status: 201 });
}
