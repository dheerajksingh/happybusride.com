import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const busType = searchParams.get("busType");
    const fromDate = searchParams.get("fromDate");

    const where: Record<string, unknown> = { isCharterAvailable: true, isActive: true };
    if (busType) where.busType = busType;

    const buses = await prisma.bus.findMany({
      where,
      include: {
        operator: {
          select: {
            id: true,
            companyName: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Only return buses from approved operators
    const available = buses.filter((b) => b.operator.status === "APPROVED");

    return NextResponse.json({ buses: available });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
