import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stopSchema = z.object({
  cityId: z.string().min(1),
  stopName: z.string().min(1),
  stopOrder: z.number().int().positive(),
  arrivalOffset: z.number().int().optional(),
  departureOffset: z.number().int().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  fromCityId: z.string().min(1).optional(),
  toCityId: z.string().min(1).optional(),
  distanceKm: z.number().int().positive().optional().nullable(),
  durationMins: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  stops: z.array(stopSchema).optional(),
});

type Params = { params: Promise<{ routeId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { routeId } = await params;
  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const route = await prisma.route.findFirst({
    where: { id: routeId, operatorId: operator.id },
    include: {
      fromCity: true,
      toCity: true,
      stops: { orderBy: { stopOrder: "asc" }, include: { city: true } },
      _count: { select: { schedules: true } },
    },
  });

  if (!route) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(route);
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { routeId } = await params;
  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.route.findFirst({
    where: { id: routeId, operatorId: operator.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { stops, ...meta } = updateSchema.parse(body);

  if (stops) {
    const route = await prisma.$transaction([
      prisma.routeStop.deleteMany({ where: { routeId } }),
      prisma.routeStop.createMany({
        data: stops.map((s) => ({ ...s, routeId })),
      }),
      prisma.route.update({ where: { id: routeId }, data: meta }),
    ]);
    return NextResponse.json(route[2]);
  }

  const route = await prisma.route.update({ where: { id: routeId }, data: meta });
  return NextResponse.json(route);
}
