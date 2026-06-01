import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "monthly";

  function periodKey(date: Date): { key: string; label: string } {
    if (view === "daily") {
      return {
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      };
    }
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    };
  }

  // ── Operator passenger earnings ──────────────────────────────
  const operatorRows = await prisma.operatorEarning.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { operator: { select: { companyName: true } } },
  });

  type OperatorSummary = {
    companyName: string;
    totalGross: number;
    totalNet: number;
    freightEarnings: number;
    periods: Record<string, { label: string; gross: number; net: number; freight: number }>;
  };
  const operatorMap: Record<string, OperatorSummary> = {};

  for (const r of operatorRows) {
    if (!operatorMap[r.operatorId]) {
      operatorMap[r.operatorId] = {
        companyName: r.operator.companyName,
        totalGross: 0,
        totalNet: 0,
        freightEarnings: 0,
        periods: {},
      };
    }
    const entry = operatorMap[r.operatorId];
    entry.totalGross += Number(r.grossAmount);
    entry.totalNet += Number(r.netPayout);

    const { key, label } = periodKey(new Date(r.createdAt));
    if (!entry.periods[key]) entry.periods[key] = { label, gross: 0, net: 0, freight: 0 };
    entry.periods[key].gross += Number(r.grossAmount);
    entry.periods[key].net += Number(r.netPayout);
  }

  // ── Freight earnings per operator ───────────────────────────
  const allOperators = await prisma.operator.findMany({ select: { id: true, companyName: true } });

  for (const op of allOperators) {
    const freightLegs = await prisma.freightLeg.findMany({
      where: {
        trip: { schedule: { bus: { operatorId: op.id } } },
        booking: {
          status: { in: ["CONFIRMED", "IN_TRANSIT", "AT_AGENT", "AT_DESTINATION", "DELIVERED"] },
        },
      },
      include: {
        booking: { select: { id: true, freightCost: true } },
      },
    });

    // Sum proportional freight earnings
    const byBooking = new Map<string, { totalDist: number; legs: typeof freightLegs; freightCost: number }>();
    for (const leg of freightLegs) {
      const bid = leg.bookingId;
      if (!byBooking.has(bid)) {
        byBooking.set(bid, { totalDist: 0, legs: [], freightCost: Number(leg.booking.freightCost ?? 0) });
      }
      const e = byBooking.get(bid)!;
      e.totalDist += Number(leg.distanceKm ?? 0);
      e.legs.push(leg);
    }

    let opFreight = 0;
    for (const [, fb] of byBooking) {
      opFreight += fb.freightCost;
    }

    if (opFreight > 0) {
      if (!operatorMap[op.id]) {
        operatorMap[op.id] = {
          companyName: op.companyName,
          totalGross: 0,
          totalNet: 0,
          freightEarnings: 0,
          periods: {},
        };
      }
      operatorMap[op.id].freightEarnings += opFreight;
    }
  }

  const operators = Object.entries(operatorMap).map(([id, v]) => ({
    id,
    companyName: v.companyName,
    totalGross: v.totalGross,
    totalNet: v.totalNet,
    freightEarnings: Math.round(v.freightEarnings),
    periods: Object.entries(v.periods)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([, p]) => p),
  }));

  // ── Agent earnings ──────────────────────────────────────────
  const agentRows = await prisma.agentEarning.findMany({
    orderBy: { date: "desc" },
    take: 500,
    include: { agent: { select: { fullName: true } } },
  });

  type AgentSummary = {
    fullName: string;
    total: number;
    settled: number;
    pending: number;
    periods: Record<string, { label: string; total: number }>;
  };
  const agentMap: Record<string, AgentSummary> = {};

  for (const r of agentRows) {
    if (!agentMap[r.agentId]) {
      agentMap[r.agentId] = { fullName: r.agent.fullName, total: 0, settled: 0, pending: 0, periods: {} };
    }
    const entry = agentMap[r.agentId];
    entry.total += Number(r.amount);
    if (r.settledAt) entry.settled += Number(r.amount);
    else entry.pending += Number(r.amount);

    const { key, label } = periodKey(new Date(r.date));
    if (!entry.periods[key]) entry.periods[key] = { label, total: 0 };
    entry.periods[key].total += Number(r.amount);
  }

  const agents = Object.entries(agentMap).map(([id, v]) => ({
    id,
    fullName: v.fullName,
    total: v.total,
    settled: v.settled,
    pending: v.pending,
    periods: Object.entries(v.periods)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([, p]) => p),
  }));

  // ── Shuttle operator income ─────────────────────────────────
  const shuttleBookings = await prisma.shuttleBooking.findMany({
    where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
    include: {
      shuttleOperator: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  type ShuttleSummary = {
    fullName: string;
    total: number;
    periods: Record<string, { label: string; total: number }>;
  };
  const shuttleMap: Record<string, ShuttleSummary> = {};

  for (const sb of shuttleBookings) {
    if (!sb.shuttleOperatorId || !sb.shuttleOperator) continue;
    const sid = sb.shuttleOperatorId;
    if (!shuttleMap[sid]) {
      shuttleMap[sid] = { fullName: sb.shuttleOperator.fullName, total: 0, periods: {} };
    }
    const entry = shuttleMap[sid];
    entry.total += Number(sb.price);

    const { key, label } = periodKey(new Date(sb.createdAt));
    if (!entry.periods[key]) entry.periods[key] = { label, total: 0 };
    entry.periods[key].total += Number(sb.price);
  }

  const shuttleOperators = Object.entries(shuttleMap).map(([id, v]) => ({
    id,
    fullName: v.fullName,
    total: Math.round(v.total),
    periods: Object.entries(v.periods)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([, p]) => ({ label: p.label, total: Math.round(p.total) })),
  }));

  const shuttleTotal = shuttleOperators.reduce((s, so) => s + so.total, 0);

  // ── Platform totals ─────────────────────────────────────────
  const [opTotal, agTotal] = await Promise.all([
    prisma.operatorEarning.aggregate({ _sum: { grossAmount: true, netPayout: true, commissionAmt: true } }),
    prisma.agentEarning.aggregate({ _sum: { amount: true } }),
  ]);

  return NextResponse.json({
    operators,
    agents,
    shuttleOperators,
    platformTotals: {
      operatorGross: Number(opTotal._sum.grossAmount ?? 0),
      platformCommission: Number(opTotal._sum.commissionAmt ?? 0),
      agentTotal: Number(agTotal._sum.amount ?? 0),
      shuttleTotal,
    },
  });
}
