import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

const driverSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  licenseNumber: z.string().min(1),
  licenseExpiry: z.string(),
  password: z.string().min(8),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json([]);

  const drivers = await prisma.driver.findMany({
    where: { operatorId: operator.id },
    include: { user: { select: { name: true, email: true, phone: true, isActive: true } } },
  });

  return NextResponse.json(drivers);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const body = await req.json();
  const { name, email, phone, licenseNumber, licenseExpiry, password } = driverSchema.parse(body);

  const pwHash = await hash(password, 10);

  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash: pwHash, role: "DRIVER" },
  });

  const driver = await prisma.driver.create({
    data: {
      userId: user.id,
      operatorId: operator.id,
      licenseNumber,
      licenseExpiry: new Date(licenseExpiry),
    },
  });

  return NextResponse.json(driver, { status: 201 });
}
