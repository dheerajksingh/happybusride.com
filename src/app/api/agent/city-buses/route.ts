import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/agent/city-buses
// Returns operators and their buses whose routes pass through the agent's city
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await prisma.agent.findUnique({
    where: { id: session.user.agentId! },
    include: { city: true },
  });
  if (!agent) return NextResponse.json({ operators: [] });

  // Find route stops in agent's city
  const stopsInCity = await prisma.routeStop.findMany({
    where: { cityId: agent.cityId },
    include: {
      route: {
        include: {
          schedules: {
            where: { isActive: true },
            include: {
              bus: {
                include: {
                  operator: {
                    select: { id: true, companyName: true, status: true, user: { select: { email: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Group by operator
  const operatorMap = new Map<string, any>();
  for (const stop of stopsInCity) {
    for (const schedule of stop.route.schedules) {
      const op = schedule.bus.operator;
      if (!operatorMap.has(op.id)) {
        operatorMap.set(op.id, { ...op, buses: [] });
      }
      const existing = operatorMap.get(op.id);
      const busIds = existing.buses.map((b: any) => b.id);
      if (!busIds.includes(schedule.bus.id)) {
        existing.buses.push({
          id: schedule.bus.id,
          name: schedule.bus.name,
          registrationNo: schedule.bus.registrationNo,
          busType: schedule.bus.busType,
          stopName: stop.stopName,
          stopOrder: stop.stopOrder,
        });
      }
    }
  }

  return NextResponse.json({
    agentCity: agent.city.name,
    operators: [...operatorMap.values()],
  });
}
