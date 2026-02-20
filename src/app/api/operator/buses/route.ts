import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const busSchema = z.object({
  name: z.string().min(1),
  registrationNo: z.string().min(1),
  busType: z.enum(["AC_SEATER", "NON_AC_SEATER", "AC_SLEEPER", "NON_AC_SLEEPER", "AC_SEMI_SLEEPER", "LUXURY"]),
  totalSeats: z.number().min(1),
  amenities: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json([]);

  const buses = await prisma.bus.findMany({
    where: { operatorId: operator.id },
    include: { _count: { select: { seats: true, schedules: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(buses);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const body = await req.json();
  const data = busSchema.parse(body);

  const bus = await prisma.bus.create({
    data: {
      ...data,
      operatorId: operator.id,
      amenities: data.amenities ?? [],
    },
  });

  return NextResponse.json(bus, { status: 201 });
}
