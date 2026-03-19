import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

const createSchema = z.object({
  // User account
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().regex(/^\d{10}$/, "10-digit phone required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Company
  companyName: z.string().min(2, "Company name is required"),
  registrationNo: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  // Bank
  bankName: z.string().optional(),
  bankAccountNo: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankAccountName: z.string().optional(),
  // Settings
  commissionRate: z.coerce.number().min(0).max(100).default(10),
  cancellationPolicy: z.enum(["FLEXIBLE", "MODERATE", "STRICT"]).default("MODERATE"),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = 20;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where = status ? { status: status as any } : {};

  const [operators, total] = await Promise.all([
    prisma.operator.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        _count: { select: { buses: true, routes: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.operator.count({ where }),
  ]);

  return NextResponse.json({ operators, total, page });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { name, email, phone, password, companyName, registrationNo, gstNumber, panNumber,
    bankName, bankAccountNo, bankIfsc, bankAccountName, commissionRate, cancellationPolicy } = parsed.data;

  // Check uniqueness
  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { phone }] } });
  if (existing) {
    const field = existing.email === email ? "Email" : "Phone";
    return NextResponse.json({ error: `${field} already in use` }, { status: 409 });
  }

  const passwordHash = await hash(password, 10);

  const operator = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, phone, passwordHash, role: "OPERATOR", emailVerified: new Date() },
    });
    return tx.operator.create({
      data: {
        userId: user.id,
        companyName,
        registrationNo: registrationNo || null,
        gstNumber: gstNumber || null,
        panNumber: panNumber || null,
        bankName: bankName || null,
        bankAccountNo: bankAccountNo || null,
        bankIfsc: bankIfsc || null,
        bankAccountName: bankAccountName || null,
        commissionRate,
        cancellationPolicy,
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy: session.user.id,
      },
      include: { user: { select: { name: true, email: true } } },
    });
  });

  return NextResponse.json({ operator }, { status: 201 });
}
