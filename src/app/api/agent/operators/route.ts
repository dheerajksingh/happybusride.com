import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — list operators this agent is linked to
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const links = await prisma.agentOperator.findMany({
    where: { agentId: session.user.agentId! },
    include: {
      operator: {
        select: {
          id: true, companyName: true, status: true,
          buses: { select: { id: true, name: true, registrationNo: true, busType: true } },
        },
      },
    },
  });

  return NextResponse.json({ operators: links.map((l) => l.operator) });
}

// POST — link this agent to an operator (by operatorId)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { operatorId } = await req.json();
  if (!operatorId) return NextResponse.json({ error: "operatorId required" }, { status: 400 });

  const operator = await prisma.operator.findUnique({ where: { id: operatorId } });
  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const link = await prisma.agentOperator.upsert({
    where: { agentId_operatorId: { agentId: session.user.agentId!, operatorId } },
    update: {},
    create: { agentId: session.user.agentId!, operatorId },
  });

  return NextResponse.json({ link }, { status: 201 });
}
