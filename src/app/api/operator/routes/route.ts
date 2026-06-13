import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcCumulativeDistances } from "@/lib/stop-distances";

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

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";

  const routes = await prisma.route.findMany({
    where: all
      ? { isActive: true }
      : { operatorId: operator.id },
    include: {
      fromCity: { select: { name: true } },
      toCity: { select: { name: true } },
      stops: { include: { city: { select: { name: true, latitude: true, longitude: true } } }, orderBy: { stopOrder: "asc" } },
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
    include: { stops: { orderBy: { stopOrder: "asc" } }, fromCity: true, toCity: true },
  });

  // Back-fill cumulative distances from CityDistance cache
  const cumulative = await calcCumulativeDistances(route.stops);
  await Promise.all(
    route.stops.map((stop, i) =>
      cumulative[i] !== null
        ? prisma.routeStop.update({ where: { id: stop.id }, data: { distanceFromOriginKm: cumulative[i] } })
        : Promise.resolve()
    )
  );

  return NextResponse.json(route, { status: 201 });
}
