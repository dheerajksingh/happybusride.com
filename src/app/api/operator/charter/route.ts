import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
    if (!operator) return NextResponse.json({ bookings: [] });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = 20;
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      prisma.charterBooking.findMany({
        where: { bus: { operatorId: operator.id } },
        include: {
          user: { select: { name: true, phone: true, email: true } },
          bus: { select: { id: true, name: true, busType: true } },
          payment: { select: { status: true, method: true, amount: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.charterBooking.count({ where: { bus: { operatorId: operator.id } } }),
    ]);

    return NextResponse.json({ bookings, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
