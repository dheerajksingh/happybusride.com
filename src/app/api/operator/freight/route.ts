import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — all freight legs on trips belonging to this operator's buses
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ freights: [] });

  const legs = await prisma.freightLeg.findMany({
    where: {
      trip: { schedule: { bus: { operatorId: operator.id } } },
      booking: { status: { notIn: ["CANCELLED", "PENDING_PAYMENT"] } },
    },
    include: {
      booking: {
        include: {
          sender:   { select: { name: true, phone: true, email: true } },
          fromCity: { select: { name: true } },
          toCity:   { select: { name: true } },
          items:    true,
        },
      },
      trip: {
        include: {
          schedule: {
            include: {
              bus:   { select: { name: true, registrationNo: true, busType: true } },
              route: { include: { fromCity: { select: { name: true } }, toCity: { select: { name: true } } } },
            },
          },
        },
      },
      stop:   { include: { city: { select: { name: true } } } },
      toStop: { include: { city: { select: { name: true } } } },
      agent:    { select: { fullName: true, phone: true } },
    },
    orderBy: { booking: { shippingDate: "asc" } },
    take: 100,
  });

  return NextResponse.json({ freights: legs });
}
