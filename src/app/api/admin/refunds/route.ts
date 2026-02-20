import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "REQUESTED";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = 20;

  const [refunds, total] = await Promise.all([
    prisma.refund.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: { status: status as any },
      include: {
        booking: {
          include: {
            user: { select: { name: true, phone: true } },
            trip: {
              include: {
                schedule: {
                  include: { route: { include: { fromCity: true, toCity: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { requestedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma.refund.count({ where: { status: status as any } }),
  ]);

  return NextResponse.json({ refunds, total });
}
