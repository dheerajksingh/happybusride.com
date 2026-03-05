import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMobileSession } from "@/lib/mobile-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = (await auth()) ?? (await getMobileSession(req));
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { walletBalance: true },
    }),
    prisma.walletTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    balance: user?.walletBalance ?? 0,
    transactions,
  });
}
