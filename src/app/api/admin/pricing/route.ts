import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rule = await prisma.commissionRule.findFirst({ where: { isActive: true } });
  return NextResponse.json(rule);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const schema = z.object({
    defaultRate: z.number().min(0).max(50),
    minCommission: z.number().min(0),
    maxCommission: z.number().min(0),
    gstRate: z.number().min(0).max(30),
  });
  const data = schema.parse(body);

  const rule = await prisma.commissionRule.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", name: "Default Commission", ...data },
  });

  return NextResponse.json(rule);
}
