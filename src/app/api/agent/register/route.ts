import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  fullName:      z.string().min(2),
  email:         z.string().email(),
  phone:         z.string().min(10),
  whatsappNumber: z.string().optional(),
  address:       z.string().min(5),
  cityId:        z.string().min(1),
  password:      z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const passwordHash = await hash(data.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          phone: data.phone,
          passwordHash,
          role: "AGENT",
        },
      });
      const agent = await tx.agent.create({
        data: {
          userId: user.id,
          fullName: data.fullName,
          address: data.address,
          cityId: data.cityId,
          phone: data.phone,
          whatsappNumber: data.whatsappNumber,
          status: "PENDING",
        },
      });
      return { userId: user.id, agentId: agent.id };
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (err: any) {
    if (err?.issues) return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
