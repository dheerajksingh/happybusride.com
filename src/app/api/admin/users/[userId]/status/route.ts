import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({ isActive: z.boolean() });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const body = await req.json();
  const { isActive } = schema.parse(body);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: { id: true, isActive: true, name: true },
  });

  return NextResponse.json(user);
}
