import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return NextResponse.json({ count: 0 });

  const count = await prisma.agentOperatorMessage.count({
    where: { agentId: session.user.agentId!, isReadByAgent: false },
  });

  return NextResponse.json({ count });
}
