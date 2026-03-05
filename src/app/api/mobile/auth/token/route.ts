import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({ userId: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = schema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        operator: { select: { id: true, status: true } },
        driver: { select: { id: true } },
      },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
    const token = await new SignJWT({
      role: user.role,
      operatorId: user.operator?.id ?? null,
      operatorStatus: user.operator?.status ?? null,
      driverId: user.driver?.id ?? null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secret);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
