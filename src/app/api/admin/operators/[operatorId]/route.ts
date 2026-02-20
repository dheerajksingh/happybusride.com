import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ operatorId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { operatorId } = await params;

  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      _count: { select: { buses: true, routes: true, drivers: true } },
    },
  });

  if (!operator) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(operator);
}
