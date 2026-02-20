import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalUsers,
    totalBookings,
    monthBookings,
    totalRevenue,
    monthRevenue,
    activeOperators,
    pendingOperators,
    pendingRefunds,
    openDisputes,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "PASSENGER" } }),
    prisma.booking.count({ where: { status: { in: ["CONFIRMED", "COMPLETED"] } } }),
    prisma.booking.count({
      where: { status: { in: ["CONFIRMED", "COMPLETED"] }, createdAt: { gte: monthStart } },
    }),
    prisma.operatorEarning.aggregate({ _sum: { commissionAmt: true } }),
    prisma.operatorEarning.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { commissionAmt: true },
    }),
    prisma.operator.count({ where: { status: "APPROVED" } }),
    prisma.operator.count({ where: { status: { in: ["PENDING_KYC", "KYC_SUBMITTED"] } } }),
    prisma.refund.count({ where: { status: "REQUESTED" } }),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
  ]);

  return NextResponse.json({
    totalUsers,
    totalBookings,
    monthBookings,
    platformRevenue: Number(totalRevenue._sum.commissionAmt ?? 0),
    monthRevenue: Number(monthRevenue._sum.commissionAmt ?? 0),
    activeOperators,
    pendingOperators,
    pendingRefunds,
    openDisputes,
  });
}
