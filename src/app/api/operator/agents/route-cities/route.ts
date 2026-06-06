import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/operator/agents/route-cities
// Returns agents located in cities that the operator's routes pass through
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ agents: [] });

  // Get all route stops for this operator's buses
  const schedules = await prisma.schedule.findMany({
    where: { bus: { operatorId: operator.id }, isActive: true },
    include: {
      route: {
        include: {
          stops: { include: { city: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  // Collect all unique city IDs from route stops
  const cityMap = new Map<string, string>(); // cityId -> cityName
  for (const schedule of schedules) {
    for (const stop of schedule.route.stops) {
      cityMap.set(stop.city.id, stop.city.name);
    }
  }

  if (!cityMap.size) return NextResponse.json({ agents: [], cities: [] });

  // Find approved agents in those cities
  const agents = await prisma.agent.findMany({
    where: {
      cityId: { in: [...cityMap.keys()] },
      status: "APPROVED",
    },
    include: {
      city: { select: { name: true } },
      user: { select: { email: true } },
    },
  });

  return NextResponse.json({
    agents: agents.map((a) => ({
      id: a.id,
      fullName: a.fullName,
      phone: a.phone,
      whatsappNumber: a.whatsappNumber,
      email: a.user?.email ?? null,
      cityId: a.cityId,
      cityName: a.city.name,
      status: a.status,
    })),
    cities: [...cityMap.entries()].map(([id, name]) => ({ id, name })),
  });
}
