import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { operatorId } = await params;
  const body = await req.json();
  const { reason } = z.object({ reason: z.string().min(1) }).parse(body);

  const operator = await prisma.operator.update({
    where: { id: operatorId },
    data: { status: "REJECTED", rejectionReason: reason },
  });

  return NextResponse.json(operator);
}
