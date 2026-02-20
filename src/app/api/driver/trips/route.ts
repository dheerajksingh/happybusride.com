import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "DRIVER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return NextResponse.json([]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const oneWeekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const trips = await prisma.trip.findMany({
    where: {
      driverId: driver.id,
      travelDate: { gte: today, lt: oneWeekLater },
    },
    include: {
      schedule: {
        include: {
          route: { include: { fromCity: true, toCity: true } },
          bus: { select: { name: true, busType: true } },
        },
      },
      _count: { select: { bookings: true } },
    },
    orderBy: { travelDate: "asc" },
  });

  return NextResponse.json(trips);
}
