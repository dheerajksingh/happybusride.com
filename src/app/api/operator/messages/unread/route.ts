import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ count: 0 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ count: 0 });

  const count = await prisma.agentOperatorMessage.count({
    where: { operatorId: operator.id, isReadByOperator: false },
  });

  return NextResponse.json({ count });
}
