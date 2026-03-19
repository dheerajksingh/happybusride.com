import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { operatorId } = await params;

  const operator = await prisma.operator.findUnique({ where: { id: operatorId }, select: { userId: true } });
  if (!operator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.operator.update({ where: { id: operatorId }, data: { status: "SUSPENDED" } }),
    prisma.user.update({ where: { id: operator.userId }, data: { isActive: false } }),
  ]);

  return NextResponse.json({ status: "SUSPENDED" });
}
