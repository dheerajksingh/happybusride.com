import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const sendSchema = z.object({
  agentId: z.string().min(1),
  message: z.string().min(1),
  freightBookingId: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ messages: [], unreadCount: 0 });

  const messages = await prisma.agentOperatorMessage.findMany({
    where: { operatorId: operator.id },
    include: {
      agent: { select: { fullName: true, phone: true, city: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const unreadCount = messages.filter((m) => !m.isReadByOperator).length;

  // Mark as read
  await prisma.agentOperatorMessage.updateMany({
    where: { operatorId: operator.id, isReadByOperator: false },
    data: { isReadByOperator: true },
  });

  return NextResponse.json({ messages, unreadCount });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data = sendSchema.parse(body);

  const msg = await prisma.agentOperatorMessage.create({
    data: {
      operatorId: operator.id,
      agentId: data.agentId,
      fromAgent: false,
      message: data.message,
      freightBookingId: data.freightBookingId ?? null,
      isReadByOperator: true,
    },
  });

  return NextResponse.json(msg, { status: 201 });
}
