import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agentBookings = await prisma.agentPassengerBooking.findMany({
    include: {
      booking: {
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
        },
      },
      agent: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  // Group by userId
  type PassengerEntry = {
    userId: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    agentName: string;
    bookingCount: number;
    lastBookingDate: Date;
  };
  const passengerMap = new Map<string, PassengerEntry>();

  for (const ab of agentBookings) {
    const user = ab.booking.user;
    const uid = user.id;
    if (!passengerMap.has(uid)) {
      passengerMap.set(uid, {
        userId: uid,
        name: user.name,
        phone: user.phone,
        email: user.email,
        agentName: ab.agent.fullName,
        bookingCount: 0,
        lastBookingDate: ab.createdAt,
      });
    }
    const entry = passengerMap.get(uid)!;
    entry.bookingCount += 1;
    if (ab.createdAt > entry.lastBookingDate) {
      entry.lastBookingDate = ab.createdAt;
      entry.agentName = ab.agent.fullName;
    }
  }

  const passengers = [...passengerMap.values()].map((p) => ({
    ...p,
    lastBookingDate: p.lastBookingDate.toISOString(),
  }));

  return NextResponse.json({ passengers });
}
