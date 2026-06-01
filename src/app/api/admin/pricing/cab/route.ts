import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const config = await prisma.cabPricingConfig.findFirst({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ config });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pricingText } = await req.json();
  if (!pricingText?.trim()) return NextResponse.json({ error: "pricingText required" }, { status: 400 });

  await prisma.cabPricingConfig.updateMany({ where: { isActive: true }, data: { isActive: false } });

  const config = await prisma.cabPricingConfig.create({
    data: { pricingText, isActive: false },
  });

  return NextResponse.json({ config }, { status: 201 });
}
