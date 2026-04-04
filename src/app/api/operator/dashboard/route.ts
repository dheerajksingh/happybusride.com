import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
    if (!operator) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      busCount,
      routeCount,
      driverCount,
      monthEarnings,
      todayTrips,
      charterTotal,
      charterPending,
      charterConfirmed,
      charterCompleted,
      charterRevenue,
    ] = await Promise.all([
      prisma.bus.count({ where: { operatorId: operator.id, isActive: true } }),
      prisma.route.count({ where: { operatorId: operator.id, isActive: true } }),
      prisma.driver.count({ where: { operatorId: operator.id } }),
      prisma.operatorEarning.aggregate({
        where: { operatorId: operator.id, createdAt: { gte: monthStart } },
        _sum: { netPayout: true },
      }),
      prisma.trip.findMany({
        where: {
          travelDate: today,
          schedule: { bus: { operatorId: operator.id } },
          status: { not: "CANCELLED" },
        },
        include: {
          schedule: {
            include: {
              route: { include: { fromCity: true, toCity: true } },
              bus: { select: { name: true } },
            },
          },
          _count: { select: { bookings: true } },
        },
        take: 5,
      }),
      prisma.charterBooking.count({ where: { bus: { operatorId: operator.id } } }),
      prisma.charterBooking.count({ where: { bus: { operatorId: operator.id }, status: "PENDING_DEPOSIT" } }),
      prisma.charterBooking.count({ where: { bus: { operatorId: operator.id }, status: "CONFIRMED" } }),
      prisma.charterBooking.count({ where: { bus: { operatorId: operator.id }, status: "COMPLETED" } }),
      prisma.charterBooking.aggregate({
        where: {
          bus: { operatorId: operator.id },
          status: "CONFIRMED",
          createdAt: { gte: monthStart },
        },
        _sum: { depositAmount: true },
      }),
    ]);

    return NextResponse.json({
      tickets: {
        busCount,
        routeCount,
        driverCount,
        monthlyEarnings: Number(monthEarnings._sum.netPayout ?? 0),
        todayTrips: todayTrips.map((t) => ({
          id: t.id,
          fromCity: t.schedule.route.fromCity.name,
          toCity: t.schedule.route.toCity.name,
          busName: t.schedule.bus.name,
          departureTime: t.schedule.departureTime,
          bookingCount: t._count.bookings,
          status: t.status,
        })),
      },
      charter: {
        total: charterTotal,
        pendingDeposit: charterPending,
        confirmed: charterConfirmed,
        completed: charterCompleted,
        revenueThisMonth: Number(charterRevenue._sum.depositAmount ?? 0),
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
