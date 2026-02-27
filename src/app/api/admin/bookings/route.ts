import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookings = await prisma.booking.findMany({
    include: {
      user: { select: { name: true, phone: true } },
      trip: {
        include: {
          schedule: {
            include: { route: { include: { fromCity: true, toCity: true } } },
          },
        },
      },
      _count: { select: { seats: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(bookings);
}
