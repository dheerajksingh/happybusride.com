import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SeatType } from "@prisma/client";
import { addDays, startOfDay } from "date-fns";

const updateSchema = z.object({
  routeId: z.string().min(1).optional(),
  busId: z.string().min(1).optional(),
  departureTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  baseFare: z.number().positive().optional(),
  recurrence: z.string().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  isActive: z.boolean().optional(),
  regenerateTrips: z.boolean().optional(),
});

type Params = { params: Promise<{ scheduleId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { scheduleId } = await params;
  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const schedule = await prisma.schedule.findFirst({
    where: { id: scheduleId, route: { operatorId: operator.id } },
    include: {
      route: {
        include: {
          fromCity: true,
          toCity: true,
          stops: { orderBy: { stopOrder: "asc" } },
        },
      },
      bus: { select: { id: true, name: true, busType: true, totalSeats: true } },
      fareRules: true,
      trips: {
        where: { travelDate: { gte: startOfDay(new Date()) } },
        orderBy: { travelDate: "asc" },
        take: 14,
        include: { _count: { select: { bookings: true } } },
      },
      _count: { select: { trips: true } },
    },
  });

  if (!schedule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(schedule);
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { scheduleId } = await params;
  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify ownership
  const existing = await prisma.schedule.findFirst({
    where: { id: scheduleId, route: { operatorId: operator.id } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { regenerateTrips, daysOfWeek, ...data } = updateSchema.parse(body);

  const updateData: Record<string, unknown> = { ...data };
  if (data.departureTime) updateData.departureTime = new Date(data.departureTime);
  if (data.arrivalTime) updateData.arrivalTime = new Date(data.arrivalTime);
  if (daysOfWeek !== undefined) updateData.daysOfWeek = daysOfWeek;

  const schedule = await prisma.schedule.update({
    where: { id: scheduleId },
    data: updateData,
  });

  if (regenerateTrips) {
    // Delete future SCHEDULED trips with no bookings
    const futureSched = await prisma.trip.findMany({
      where: {
        scheduleId,
        travelDate: { gte: startOfDay(new Date()) },
        status: "SCHEDULED",
      },
      include: { _count: { select: { bookings: true } } },
    });
    const deletable = futureSched.filter((t) => t._count.bookings === 0).map((t) => t.id);
    if (deletable.length > 0) {
      await prisma.trip.deleteMany({ where: { id: { in: deletable } } });
    }

    // Recreate trips filtered by new daysOfWeek
    const effectiveDow = daysOfWeek ?? schedule.daysOfWeek ?? [];
    const tripData = [];
    for (let d = 0; d <= 30; d++) {
      const travelDate = startOfDay(addDays(new Date(), d));
      if (effectiveDow.length > 0 && !effectiveDow.includes(travelDate.getDay())) continue;
      tripData.push({ scheduleId, travelDate, status: "SCHEDULED" as const });
    }
    await prisma.trip.createMany({ data: tripData, skipDuplicates: true });
  }

  return NextResponse.json(schedule);
}
