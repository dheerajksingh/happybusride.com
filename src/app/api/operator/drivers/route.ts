import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

const driverSchema = z.object({
  name: z.string().min(1, "Name is required"),
  // Required — the driver logs in to the driver app with email + password.
  email: z.string().email("Enter a valid email address"),
  phone: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number").optional()
  ),
  licenseNumber: z.string().min(1, "License number is required"),
  licenseExpiry: z.string().refine((v) => !isNaN(Date.parse(v)), "Enter a valid license expiry date"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const availableOnly = searchParams.get("available") === "true";

  const scheduledDriverIds = availableOnly
    ? (await prisma.schedule.findMany({
        where: { bus: { operatorId: operator.id }, isActive: true, driverId: { not: null } },
        select: { driverId: true },
      })).map((s) => s.driverId as string)
    : [];

  const drivers = await prisma.driver.findMany({
    where: {
      operatorId: operator.id,
      ...(availableOnly ? { id: { notIn: scheduledDriverIds } } : {}),
    },
    include: { user: { select: { name: true, email: true, phone: true, isActive: true } } },
  });

  return NextResponse.json(drivers);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  try {
    const body = await req.json();
    const { name, email, phone, licenseNumber, licenseExpiry, password } = driverSchema.parse(body);

    // email/phone are globally unique across all users — check up front so the
    // operator gets a clear message instead of a constraint failure.
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
      select: { email: true },
    });
    if (existingUser) {
      const field = existingUser.email === email ? "email" : "phone number";
      return NextResponse.json(
        { error: `A user with this ${field} already exists` },
        { status: 409 }
      );
    }

    const existingLicense = await prisma.driver.findUnique({ where: { licenseNumber } });
    if (existingLicense) {
      return NextResponse.json(
        { error: "A driver with this license number already exists" },
        { status: 409 }
      );
    }

    const pwHash = await hash(password, 10);

    // Transaction so a driver-create failure doesn't leave an orphaned user.
    const driver = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, phone, passwordHash: pwHash, role: "DRIVER" },
      });
      return tx.driver.create({
        data: {
          userId: user.id,
          operatorId: operator.id,
          licenseNumber,
          licenseExpiry: new Date(licenseExpiry),
        },
      });
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    // Unique-constraint race (pre-checks passed but insert collided)
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
      return NextResponse.json(
        { error: "A user with this email, phone or license number already exists" },
        { status: 409 }
      );
    }
    console.error("[operator/drivers POST]", err);
    return NextResponse.json({ error: "Failed to create driver" }, { status: 500 });
  }
}
