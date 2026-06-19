import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcCumulativeDistances } from "@/lib/stop-distances";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const routes = await prisma.route.findMany({
    include: { stops: { orderBy: { stopOrder: "asc" } } },
  });

  const results: { routeId: string; name: string; totalKm: number | null; updated: boolean }[] = [];

  for (const route of routes) {
    const cumulative = await calcCumulativeDistances(route.stops);
    const totalKm = cumulative[cumulative.length - 1] ?? null;

    await Promise.all(
      route.stops.map((stop, i) =>
        cumulative[i] !== null
          ? prisma.routeStop.update({ where: { id: stop.id }, data: { distanceFromOriginKm: cumulative[i] } })
          : Promise.resolve()
      )
    );

    if (totalKm !== null) {
      await prisma.route.update({ where: { id: route.id }, data: { distanceKm: totalKm } });
    }

    results.push({ routeId: route.id, name: route.name, totalKm, updated: totalKm !== null });
  }

  return NextResponse.json({ ok: true, routes: results });
}
