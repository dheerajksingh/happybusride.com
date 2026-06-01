import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { fullName, address, cityId, phone, whatsapp, email, password, vehicleReg, vehicleType, driverName, driverPhone } = await req.json();

  if (!fullName || !address || !cityId || !phone || !email || !password) {
    return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "CAB_OPERATOR",
      name: fullName,
      cabOperator: {
        create: {
          fullName,
          address,
          cityId,
          phone,
          whatsapp: whatsapp || null,
          email,
          vehicleReg: vehicleReg || null,
          vehicleType: vehicleType || null,
          driverName: driverName || null,
          driverPhone: driverPhone || null,
        },
      },
    },
  });

  return NextResponse.json({ userId: user.id }, { status: 201 });
}
