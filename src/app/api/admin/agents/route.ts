import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agents = await prisma.agent.findMany({
    include: {
      user: { select: { email: true, createdAt: true } },
      city: { select: { name: true, state: true } },
      operators: { select: { operator: { select: { companyName: true } } } },
      _count: { select: { passengerBookings: true, freightBookings: true, freightLegs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ agents });
}
