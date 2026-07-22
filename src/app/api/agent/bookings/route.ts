import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — all passenger bookings made by this agent
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // agentId may be absent from a stale JWT; fall back to looking up by userId.
  let agentId = session.user.agentId;
  if (!agentId) {
    const agent = await prisma.agent.findUnique({ where: { userId: session.user.id } });
    agentId = agent?.id ?? null;
  }
  if (!agentId) return NextResponse.json({ bookings: [] });

  const agentBookings = await prisma.agentPassengerBooking.findMany({
    where: { agentId },
    include: {
      booking: {
        include: {
          trip: {
            include: {
              schedule: {
                include: {
                  route: {
                    include: {
                      fromCity: { select: { name: true } },
                      toCity: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
          passengers: true,
          payment: { select: { status: true, amount: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ bookings: agentBookings });
}
