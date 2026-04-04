import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const status = searchParams.get("status") ?? "";
    const q = (searchParams.get("q") ?? "").trim();
    const limit = 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CharterBookingWhereInput = {};
    if (status) where.status = status as Prisma.EnumCharterBookingStatusFilter;
    if (q) {
      where.OR = [
        { pnr: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { phone: { contains: q } } },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.charterBooking.findMany({
        where,
        include: {
          user: { select: { name: true, phone: true } },
          bus: {
            select: {
              name: true,
              busType: true,
              operator: { select: { companyName: true } },
            },
          },
          payment: { select: { status: true, method: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.charterBooking.count({ where }),
    ]);

    return NextResponse.json({ bookings, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
