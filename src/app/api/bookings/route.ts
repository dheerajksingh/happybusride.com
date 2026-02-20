import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const limit = 10;
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: { userId: session.user.id },
        include: {
          trip: {
            include: {
              schedule: {
                include: {
                  route: {
                    include: {
                      fromCity: { select: { name: true } },
                      toCity: { select: { name: true } },
                    },
                  },
                  bus: { select: { name: true, busType: true } },
                },
              },
            },
          },
          seats: { include: { seat: { select: { seatNumber: true } } } },
          payment: { select: { status: true, method: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where: { userId: session.user.id } }),
    ]);

    return NextResponse.json({ bookings, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
