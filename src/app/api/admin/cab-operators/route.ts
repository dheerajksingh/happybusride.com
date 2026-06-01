import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operators = await prisma.cabOperator.findMany({
    include: {
      city: { select: { name: true, state: true } },
      user: { select: { email: true } },
      _count: { select: { bookings: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ operators });
}
