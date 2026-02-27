import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      passenger: {
        select: { gender: true, dob: true, address: true },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    gender: user.passenger?.gender ?? null,
    dob: user.passenger?.dob ?? null,
    address: user.passenger?.address ?? null,
  });
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  dob: z.string().nullable().optional(),
  address: z.string().max(500).nullable().optional(),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data = updateSchema.parse(body);

  await prisma.$transaction([
    ...(data.name
      ? [prisma.user.update({ where: { id: session.user.id }, data: { name: data.name } })]
      : []),
    prisma.passengerProfile.upsert({
      where: { userId: session.user.id },
      update: {
        gender: data.gender ?? undefined,
        dob: data.dob ? new Date(data.dob) : data.dob === null ? null : undefined,
        address: data.address ?? undefined,
      },
      create: {
        userId: session.user.id,
        gender: data.gender ?? undefined,
        dob: data.dob ? new Date(data.dob) : undefined,
        address: data.address ?? undefined,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
