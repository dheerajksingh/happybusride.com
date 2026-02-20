import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = 20;

  const trips = await prisma.trip.findMany({
    where: { schedule: { bus: { operatorId: operator.id } } },
    include: {
      schedule: {
        include: {
          route: { include: { fromCity: true, toCity: true } },
          bus: { select: { name: true } },
        },
      },
      driver: { include: { user: { select: { name: true } } } },
      _count: { select: { bookings: true } },
    },
    orderBy: [{ travelDate: "desc" }],
    skip: (page - 1) * limit,
    take: limit,
  });

  return NextResponse.json(trips);
}
