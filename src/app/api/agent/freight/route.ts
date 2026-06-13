import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentId = session.user.agentId!;

  const [booked, handling] = await Promise.all([
    // Freight the agent booked — full details
    prisma.freightBooking.findMany({
      where: { bookedByAgentId: agentId },
      include: {
        sender: { select: { name: true, phone: true, email: true } },
        fromCity: { select: { name: true } },
        toCity: { select: { name: true } },
        items: true,
        legs: {
          orderBy: { legOrder: "asc" },
          include: {
            trip: {
              include: {
                schedule: {
                  include: {
                    bus: { select: { name: true, registrationNo: true, busType: true } },
                    route: { include: { fromCity: { select: { name: true } }, toCity: { select: { name: true } } } },
                  },
                },
              },
            },
            stop:   { include: { city: { select: { name: true } } } },
            toStop: { include: { city: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

    // Freight legs this agent is handling — full details
    prisma.freightLeg.findMany({
      where: { agentId },
      include: {
        booking: {
          include: {
            sender: { select: { name: true, phone: true, email: true } },
            fromCity: { select: { name: true } },
            toCity: { select: { name: true } },
            items: true,
          },
        },
        trip: {
          include: {
            schedule: {
              include: {
                bus: { select: { name: true, registrationNo: true, busType: true } },
                route: { include: { fromCity: { select: { name: true } }, toCity: { select: { name: true } } } },
              },
            },
          },
        },
        stop:   { include: { city: { select: { name: true } } } },
        toStop: { include: { city: { select: { name: true } } } },
      },
      orderBy: { booking: { createdAt: "desc" } },
      take: 50,
    }),
  ]);

  return NextResponse.json({ booked, handling });
}
