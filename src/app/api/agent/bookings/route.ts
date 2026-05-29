import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — all passenger bookings made by this agent
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentBookings = await prisma.agentPassengerBooking.findMany({
    where: { agentId: session.user.agentId! },
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
