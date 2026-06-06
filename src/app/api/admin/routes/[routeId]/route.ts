import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
