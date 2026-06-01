import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "CAB_OPERATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const operator = await prisma.cabOperator.findUnique({
    where: { userId: session.user.id },
  });
  if (!operator) return NextResponse.json({ bookings: [] });

  const bookings = await prisma.cabBooking.findMany({
    where: { cabOperatorId: operator.id },
    include: {
      booking: {
        include: {
          user: { select: { name: true, phone: true } },
        },
      },
      city: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ bookings });
}
