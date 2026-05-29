import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agent = await prisma.agent.findUnique({
    where: { id: session.user.agentId! },
    include: {
      city: { select: { id: true, name: true, state: true } },
      operators: {
        include: { operator: { select: { id: true, companyName: true, status: true } } },
      },
    },
  });

  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  return NextResponse.json({ agent });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const agent = await prisma.agent.update({
    where: { id: session.user.agentId! },
    data: {
      address:       body.address       ?? undefined,
      whatsappNumber: body.whatsappNumber ?? undefined,
      panNumber:     body.panNumber     ?? undefined,
      aadhaarNumber: body.aadhaarNumber ?? undefined,
      panDocUrl:     body.panDocUrl     ?? undefined,
      aadhaarDocUrl: body.aadhaarDocUrl ?? undefined,
    },
  });
  return NextResponse.json({ agent });
}
