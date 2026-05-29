import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: { status: "SUSPENDED" },
  });
  return NextResponse.json({ agent });
}
