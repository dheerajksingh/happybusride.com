import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await prisma.agentChargeConfig.findFirst({ where: { isActive: true } });
  return NextResponse.json({ config });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  await prisma.agentChargeConfig.updateMany({ where: { isActive: true }, data: { isActive: false } });

  const config = await prisma.agentChargeConfig.create({
    data: {
      agentOriginPct:       Number(body.agentOriginPct       ?? 5),
      agentInterimPct:      Number(body.agentInterimPct      ?? 10),
      agentFinalPct:        Number(body.agentFinalPct        ?? 5),
      agentSeatBookingComm: Number(body.agentSeatBookingComm ?? 3),
      agentFreightComm:     Number(body.agentFreightComm     ?? 5),
      perDayHoldingRate:    Number(body.perDayHoldingRate    ?? 50),
      isActive: true,
    },
  });

  return NextResponse.json({ config });
}
