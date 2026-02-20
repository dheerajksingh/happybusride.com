import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stopSchema = z.object({
  cityId: z.string(),
  stopOrder: z.number(),
  stopName: z.string().min(1),
  arrivalOffset: z.number().optional(),
  departureOffset: z.number().optional(),
});

const routeSchema = z.object({
  fromCityId: z.string().min(1),
  toCityId: z.string().min(1),
  name: z.string().min(1),
  distanceKm: z.number().optional(),
  durationMins: z.number().optional(),
  stops: z.array(stopSchema).min(2),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json([]);

  const routes = await prisma.route.findMany({
    where: { operatorId: operator.id },
    include: {
      fromCity: { select: { name: true } },
      toCity: { select: { name: true } },
      stops: { include: { city: { select: { name: true } } }, orderBy: { stopOrder: "asc" } },
      _count: { select: { schedules: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(routes);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const body = await req.json();
  const data = routeSchema.parse(body);
  const { stops, ...routeData } = data;

  const route = await prisma.route.create({
    data: {
      ...routeData,
      operatorId: operator.id,
      stops: { create: stops },
    },
    include: { stops: true, fromCity: true, toCity: true },
  });

  return NextResponse.json(route, { status: 201 });
}
