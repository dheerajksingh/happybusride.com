import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  companyName: z.string().min(1),
  registrationNo: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  cancellationPolicy: z.enum(["FLEXIBLE", "MODERATE", "STRICT"]).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({
    where: { userId: session.user.id },
    include: { buses: { select: { id: true, name: true, isActive: true } } },
  });

  return NextResponse.json(operator);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data = schema.parse(body);

  const existing = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (existing) {
    const updated = await prisma.operator.update({ where: { userId: session.user.id }, data });
    return NextResponse.json(updated);
  }

  const operator = await prisma.operator.create({
    data: { ...data, userId: session.user.id, status: "PENDING_KYC" },
  });
  return NextResponse.json(operator, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const bankSchema = z.object({
    bankAccountNo: z.string().optional(),
    bankIfsc: z.string().optional(),
    bankName: z.string().optional(),
    bankAccountName: z.string().optional(),
    panDocUrl: z.string().optional(),
    gstDocUrl: z.string().optional(),
    rcDocUrl: z.string().optional(),
    bankProofUrl: z.string().optional(),
  });
  const data = bankSchema.parse(body);
  const operator = await prisma.operator.update({ where: { userId: session.user.id }, data });
  return NextResponse.json(operator);
}
