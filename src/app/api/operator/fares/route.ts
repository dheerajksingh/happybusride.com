import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SeatType } from "@prisma/client";

const createSchema = z.object({
  scheduleId: z.string().min(1),
  seatType: z.nativeEnum(SeatType),
  price: z.number().positive(),
  fromStopId: z.string().min(1).optional().nullable(),
  toStopId: z.string().min(1).optional().nullable(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  price: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json([]);

  const fareRules = await prisma.fareRule.findMany({
    where: { schedule: { route: { operatorId: operator.id } } },
    include: {
      schedule: {
        include: {
          route: { include: { fromCity: true, toCity: true } },
        },
      },
      fromStop: { select: { id: true, stopName: true } },
      toStop: { select: { id: true, stopName: true } },
    },
    orderBy: [{ scheduleId: "asc" }, { seatType: "asc" }],
  });

  return NextResponse.json(fareRules);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data = createSchema.parse(body);

  // Verify schedule ownership
  const schedule = await prisma.schedule.findFirst({
    where: { id: data.scheduleId, route: { operatorId: operator.id } },
  });
  if (!schedule) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });

  // App-level duplicate check
  const existing = await prisma.fareRule.findFirst({
    where: {
      scheduleId: data.scheduleId,
      seatType: data.seatType,
      fromStopId: data.fromStopId ?? null,
      toStopId: data.toStopId ?? null,
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Fare rule already exists for this combination" }, { status: 409 });
  }

  const fareRule = await prisma.fareRule.create({
    data: {
      scheduleId: data.scheduleId,
      seatType: data.seatType,
      price: data.price,
      fromStopId: data.fromStopId ?? null,
      toStopId: data.toStopId ?? null,
    },
  });

  return NextResponse.json(fareRule, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { id, ...data } = updateSchema.parse(body);

  // Verify ownership
  const existing = await prisma.fareRule.findFirst({
    where: { id, schedule: { route: { operatorId: operator.id } } },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fareRule = await prisma.fareRule.update({ where: { id }, data });
  return NextResponse.json(fareRule);
}
