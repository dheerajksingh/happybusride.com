import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";

const STAFF_ROLES = ["OPERATOR", "DRIVER", "AGENT", "ADMIN", "SHUTTLE_OPERATOR", "CAB_OPERATOR"];

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { operator: true, driver: true, agent: true },
  });

  if (!user || !user.passwordHash || !user.isActive) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (!STAFF_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Use the passenger app to log in" }, { status: 403 });
  }

  const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
  const token = await new SignJWT({
    role:            user.role,
    operatorId:      user.operator?.id      ?? null,
    operatorStatus:  user.operator?.status  ?? null,
    driverId:        user.driver?.id        ?? null,
    agentId:         user.agent?.id         ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  return NextResponse.json({
    token,
    user: {
      id:          user.id,
      name:        user.name,
      email:       user.email,
      role:        user.role,
      operatorId:  user.operator?.id  ?? null,
      agentId:     user.agent?.id     ?? null,
      driverId:    user.driver?.id    ?? null,
    },
  });
}
