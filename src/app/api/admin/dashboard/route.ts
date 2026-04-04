import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalPassengers,
      totalBookings,
      monthBookings,
      platformRevenue,
      activeOperators,
      pendingKyc,
      pendingRefunds,
      openDisputes,
      charterTotal,
      charterPending,
      charterConfirmed,
      charterCompleted,
      charterRevenue,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "PASSENGER" } }),
      prisma.booking.count({ where: { status: { in: ["CONFIRMED", "COMPLETED"] } } }),
      prisma.booking.count({
        where: { createdAt: { gte: monthStart }, status: { in: ["CONFIRMED", "COMPLETED"] } },
      }),
      prisma.operatorEarning.aggregate({ _sum: { commissionAmt: true } }),
      prisma.operator.count({ where: { status: "APPROVED" } }),
      prisma.operator.count({ where: { status: { in: ["PENDING_KYC", "KYC_SUBMITTED"] } } }),
      prisma.refund.count({ where: { status: "REQUESTED" } }),
      prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
      prisma.charterBooking.count(),
      prisma.charterBooking.count({ where: { status: "PENDING_DEPOSIT" } }),
      prisma.charterBooking.count({ where: { status: "CONFIRMED" } }),
      prisma.charterBooking.count({ where: { status: "COMPLETED" } }),
      prisma.charterBooking.aggregate({
        where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
        _sum: { depositAmount: true },
      }),
    ]);

    return NextResponse.json({
      tickets: {
        totalPassengers,
        totalBookings,
        monthBookings,
        platformRevenue: Number(platformRevenue._sum.commissionAmt ?? 0),
        activeOperators,
        pendingKyc,
        pendingRefunds,
        openDisputes,
      },
      charter: {
        total: charterTotal,
        pendingDeposit: charterPending,
        confirmed: charterConfirmed,
        completed: charterCompleted,
        totalDepositRevenue: Number(charterRevenue._sum.depositAmount ?? 0),
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
