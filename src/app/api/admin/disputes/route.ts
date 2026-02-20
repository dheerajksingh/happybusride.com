import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "OPEN";

  const disputes = await prisma.dispute.findMany({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { status: status as any },
    include: {
      booking: {
        include: {
          trip: {
            include: {
              schedule: { include: { route: { include: { fromCity: true, toCity: true } } } },
            },
          },
        },
      },
      user: { select: { name: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(disputes);
}
