import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const sendSchema = z.object({
  operatorId: z.string().min(1),
  message: z.string().min(1),
  freightBookingId: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentId = session.user.agentId!;

  const messages = await prisma.agentOperatorMessage.findMany({
    where: { agentId },
    include: {
      operator: { select: { companyName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Mark agent messages as read
  await prisma.agentOperatorMessage.updateMany({
    where: { agentId, isReadByAgent: false },
    data: { isReadByAgent: true },
  });

  const unreadCount = messages.filter((m) => !m.isReadByAgent).length;

  return NextResponse.json({ messages, unreadCount });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentId = session.user.agentId!;
  const body = await req.json();
  const data = sendSchema.parse(body);

  const msg = await prisma.agentOperatorMessage.create({
    data: {
      agentId,
      operatorId: data.operatorId,
      fromAgent: true,
      message: data.message,
      freightBookingId: data.freightBookingId ?? null,
      isReadByAgent: true,
    },
  });

  return NextResponse.json(msg, { status: 201 });
}
