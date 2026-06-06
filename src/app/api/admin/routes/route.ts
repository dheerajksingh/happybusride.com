import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stopSchema = z.object({
  cityId: z.string().min(1),
  stopOrder: z.number().int().min(1),
  stopName: z.string().min(1),
  arrivalOffset: z.number().optional(),
  departureOffset: z.number().optional(),
});

const routeSchema = z.object({
  fromCityId: z.string().min(1),
  toCityId: z.string().min(1),
  name: z.string().min(1),
  distanceKm: z.number().positive().optional(),
  durationMins: z.number().positive().optional(),
  stops: z.array(stopSchema).min(2),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const routes = await prisma.route.findMany({
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
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data = routeSchema.parse(body);
  const { stops, ...routeData } = data;

  const route = await prisma.route.create({
    data: {
      ...routeData,
      // operatorId is null for admin-created routes
      stops: { create: stops },
    },
    include: { stops: true, fromCity: true, toCity: true },
  });

  return NextResponse.json(route, { status: 201 });
}
