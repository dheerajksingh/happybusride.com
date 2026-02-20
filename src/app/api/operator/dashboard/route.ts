import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [busCount, routeCount, driverCount, monthEarnings, todayTrips, pendingBookings] = await Promise.all([
    prisma.bus.count({ where: { operatorId: operator.id, isActive: true } }),
    prisma.route.count({ where: { operatorId: operator.id, isActive: true } }),
    prisma.driver.count({ where: { operatorId: operator.id } }),
    prisma.operatorEarning.aggregate({
      where: { operatorId: operator.id, createdAt: { gte: monthStart } },
      _sum: { netPayout: true, grossAmount: true },
    }),
    prisma.trip.count({
      where: {
        travelDate: today,
        schedule: { bus: { operatorId: operator.id } },
        status: { not: "CANCELLED" },
      },
    }),
    prisma.booking.count({
      where: {
        trip: { schedule: { bus: { operatorId: operator.id } } },
        status: "CONFIRMED",
      },
    }),
  ]);

  return NextResponse.json({
    busCount,
    routeCount,
    driverCount,
    todayTrips,
    pendingBookings,
    monthEarnings: {
      net: Number(monthEarnings._sum.netPayout ?? 0),
      gross: Number(monthEarnings._sum.grossAmount ?? 0),
    },
  });
}
