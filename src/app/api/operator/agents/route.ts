import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const operator = await prisma.operator.findUnique({
    where: { userId: session.user.id },
  });
  if (!operator) return NextResponse.json({ agents: [] });

  const agentOperators = await prisma.agentOperator.findMany({
    where: { operatorId: operator.id },
    include: {
      agent: {
        include: {
          user: { select: { email: true } },
          city: { select: { name: true } },
          _count: {
            select: {
              passengerBookings: true,
              freightBookings: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const agents = agentOperators.map((ao) => ({
    id: ao.agent.id,
    fullName: ao.agent.fullName,
    phone: ao.agent.phone,
    email: ao.agent.user?.email ?? null,
    cityName: ao.agent.city.name,
    status: ao.agent.status,
    passengerBookings: ao.agent._count.passengerBookings,
    freightBookings: ao.agent._count.freightBookings,
    linkedAt: ao.createdAt,
  }));

  return NextResponse.json({ agents });
}
