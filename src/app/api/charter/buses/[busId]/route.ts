import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ busId: string }> }) {
  try {
    const { busId } = await params;

    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      include: {
        operator: {
          select: {
            id: true,
            companyName: true,
            status: true,
            cancellationPolicy: true,
          },
        },
      },
    });

    if (!bus) return NextResponse.json({ error: "Bus not found" }, { status: 404 });
    if (!bus.isCharterAvailable) return NextResponse.json({ error: "Bus not available for charter" }, { status: 404 });
    if (!bus.isActive) return NextResponse.json({ error: "Bus not active" }, { status: 404 });
    if (bus.operator.status !== "APPROVED") return NextResponse.json({ error: "Operator not approved" }, { status: 404 });

    return NextResponse.json({ bus });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
