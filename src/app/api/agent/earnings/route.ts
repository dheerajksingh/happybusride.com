import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agentId = session.user.agentId!;
  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "monthly"; // "daily" | "monthly"

  // All-time totals by type
  const byType = await prisma.agentEarning.groupBy({
    by: ["type"],
    where: { agentId },
    _sum: { amount: true },
    _count: true,
  });

  // Overall totals
  const totals = await prisma.agentEarning.aggregate({
    where: { agentId },
    _sum: { amount: true },
    _count: true,
  });

  // Recent 60 rows for the table
  const recent = await prisma.agentEarning.findMany({
    where: { agentId },
    orderBy: { date: "desc" },
    take: 60,
  });

  // Group by day or month in JS (avoids dialect-specific date_trunc)
  const grouped: Record<string, { label: string; total: number; byType: Record<string, number> }> = {};
  for (const e of recent) {
    const d = new Date(e.date);
    const key =
      view === "daily"
        ? d.toISOString().slice(0, 10)
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label =
      view === "daily"
        ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    if (!grouped[key]) grouped[key] = { label, total: 0, byType: {} };
    grouped[key].total += Number(e.amount);
    grouped[key].byType[e.type] = (grouped[key].byType[e.type] ?? 0) + Number(e.amount);
  }

  const periods = Object.entries(grouped)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, v]) => v);

  return NextResponse.json({ totals, byType, periods, recent });
}
