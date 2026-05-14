import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const messages = await prisma.corporateChatMessage.findMany({
    where: { requestId: id },
    include: { sender: { select: { name: true, role: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { message } = await req.json();

  if (!message?.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const msg = await prisma.corporateChatMessage.create({
    data: {
      requestId: id,
      senderId: session.user.id,
      senderRole: session.user.role,
      message: message.trim(),
    },
    include: { sender: { select: { name: true, role: true } } },
  });

  return NextResponse.json({ message: msg }, { status: 201 });
}
