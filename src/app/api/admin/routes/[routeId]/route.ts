import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcCumulativeDistances } from "@/lib/stop-distances";

export async function GET(_req: Request, { params }: { params: Promise<{ routeId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { routeId } = await params;
  const route = await prisma.route.findUnique({
    where: { id: routeId },
    include: {
      fromCity: true,
      toCity: true,
      stops: { include: { city: true }, orderBy: { stopOrder: "asc" } },
      _count: { select: { schedules: true } },
    },
  });

  if (!route) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(route);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ routeId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { routeId } = await params;
  const body = await req.json();

  // If stops are being updated, replace intermediate stops (keep first and last)
  if (body.stops) {
    const existing = await prisma.routeStop.findMany({
      where: { routeId },
      orderBy: { stopOrder: "asc" },
    });

    const hasSchedules = await prisma.schedule.count({ where: { routeId } });
    if (hasSchedules > 0) {
      return NextResponse.json({ error: "Cannot modify stops — route has active schedules" }, { status: 409 });
    }

    const first = existing[0];
    const last  = existing[existing.length - 1];

    // Delete all intermediate stops
    await prisma.routeStop.deleteMany({
      where: { routeId, id: { notIn: [first.id, last.id] } },
    });

    // Insert new intermediate stops
    const newIntermediates: { cityId: string; stopName: string; stopOrder: number; arrivalOffset: number; departureOffset: number }[] = body.stops;
    for (let i = 0; i < newIntermediates.length; i++) {
      await prisma.routeStop.create({
        data: {
          routeId,
          cityId: newIntermediates[i].cityId,
          stopName: newIntermediates[i].stopName,
          stopOrder: i + 2,
          arrivalOffset: newIntermediates[i].arrivalOffset,
          departureOffset: newIntermediates[i].departureOffset,
        },
      });
    }

    // Re-number last stop
    await prisma.routeStop.update({
      where: { id: last.id },
      data: { stopOrder: newIntermediates.length + 2 },
    });

    // Recalculate cumulative distances (CityDistance cache → Haversine fallback)
    const allStops = await prisma.routeStop.findMany({
      where: { routeId },
      orderBy: { stopOrder: "asc" },
    });
    const cumulative = await calcCumulativeDistances(allStops);
    await Promise.all(
      allStops.map((s, i) =>
        cumulative[i] !== null
          ? prisma.routeStop.update({ where: { id: s.id }, data: { distanceFromOriginKm: cumulative[i] } })
          : Promise.resolve()
      )
    );
    // Sync route.distanceKm to the calculated total
    const totalKm = cumulative[cumulative.length - 1];
    if (totalKm !== null) {
      await prisma.route.update({ where: { id: routeId }, data: { distanceKm: totalKm } });
    }

    return NextResponse.json({ ok: true });
  }

  const route = await prisma.route.update({
    where: { id: routeId },
    data: {
      name: body.name,
      distanceKm: body.distanceKm ?? null,
      durationMins: body.durationMins ?? null,
      isActive: body.isActive ?? undefined,
    },
  });

  return NextResponse.json(route);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ routeId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { routeId } = await params;
  await prisma.route.update({ where: { id: routeId }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
