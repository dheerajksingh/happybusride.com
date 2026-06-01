import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "SHUTTLE_OPERATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const operator = await prisma.shuttleOperator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const bookings = await prisma.shuttleBooking.findMany({
    where: { shuttleOperatorId: operator.id },
    include: {
      city: { select: { name: true } },
      vehicle: { select: { name: true, vehicleType: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ bookings });
}
