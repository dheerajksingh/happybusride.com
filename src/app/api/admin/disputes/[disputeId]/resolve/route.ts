import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ disputeId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { disputeId } = await params;
  const body = await req.json();
  const { resolution } = z.object({ resolution: z.string().min(1) }).parse(body);

  const dispute = await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      status: "RESOLVED",
      resolution,
      assignedTo: session.user.id,
      resolvedAt: new Date(),
    },
  });

  return NextResponse.json(dispute);
}
