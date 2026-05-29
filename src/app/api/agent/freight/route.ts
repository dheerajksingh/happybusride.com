import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — freight bookings this agent booked or is handling
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [booked, handling] = await Promise.all([
    // Freight the agent booked on behalf of someone
    prisma.freightBooking.findMany({
      where: { bookedByAgentId: session.user.agentId! },
      include: {
        fromCity: { select: { name: true } },
        toCity: { select: { name: true } },
        items: true,
        legs: { orderBy: { legOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    // Freight legs where this agent is handling
    prisma.freightLeg.findMany({
      where: { agentId: session.user.agentId! },
      include: {
        booking: {
          include: {
            fromCity: { select: { name: true } },
            toCity: { select: { name: true } },
            items: true,
          },
        },
        stop: { include: { city: { select: { name: true } } } },
      },
      orderBy: { booking: { createdAt: "desc" } },
      take: 30,
    }),
  ]);

  return NextResponse.json({ booked, handling });
}
