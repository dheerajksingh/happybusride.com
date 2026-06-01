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
    include: {
      city: { select: { name: true, state: true } },
      _count: { select: { bookings: true } },
    },
  });

  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const pendingBookings = await prisma.cabBooking.count({
    where: { cabOperatorId: operator.id, status: "PENDING" },
  });

  return NextResponse.json({ operator, pendingBookings });
}
