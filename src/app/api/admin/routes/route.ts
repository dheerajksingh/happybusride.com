import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcCumulativeDistances } from "@/lib/stop-distances";

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
    include: { stops: { orderBy: { stopOrder: "asc" } }, fromCity: true, toCity: true },
  });

  // Back-fill cumulative distances (CityDistance cache → Haversine fallback)
  const cumulative = await calcCumulativeDistances(route.stops);
  await Promise.all(
    route.stops.map((stop, i) =>
      cumulative[i] !== null
        ? prisma.routeStop.update({ where: { id: stop.id }, data: { distanceFromOriginKm: cumulative[i] } })
        : Promise.resolve()
    )
  );

  // If distanceKm was not provided, set it from the calculated total
  const totalKm = cumulative[cumulative.length - 1];
  if (totalKm !== null && !data.distanceKm) {
    await prisma.route.update({ where: { id: route.id }, data: { distanceKm: totalKm } });
  }

  return NextResponse.json(route, { status: 201 });
}
