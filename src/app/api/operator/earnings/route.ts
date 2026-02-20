import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ earnings: [], totals: {} });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = 20;

  const [earnings, totals] = await Promise.all([
    prisma.operatorEarning.findMany({
      where: { operatorId: operator.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.operatorEarning.aggregate({
      where: { operatorId: operator.id },
      _sum: { grossAmount: true, commissionAmt: true, netPayout: true },
      _count: true,
    }),
  ]);

  return NextResponse.json({ earnings, totals });
}
