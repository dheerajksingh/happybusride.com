import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { role: "PASSENGER" },
    include: { _count: { select: { bookings: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(users);
}
