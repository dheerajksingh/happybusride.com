import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ refundId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { refundId } = await params;
  const body = await req.json();
  const { reason } = z.object({ reason: z.string().optional() }).parse(body);

  await prisma.refund.update({
    where: { id: refundId },
    data: {
      status: "REJECTED",
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      rejectionReason: reason,
    },
  });

  return NextResponse.json({ success: true });
}
