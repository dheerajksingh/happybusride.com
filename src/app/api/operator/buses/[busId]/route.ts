import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const busSchema = z.object({
  name: z.string().min(1).optional(),
  registrationNo: z.string().optional(),
  busType: z.enum(["AC_SEATER", "NON_AC_SEATER", "AC_SLEEPER", "NON_AC_SLEEPER", "AC_SEMI_SLEEPER", "LUXURY"]).optional(),
  totalSeats: z.number().min(1).optional(),
  amenities: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ busId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { busId } = await params;
  const bus = await prisma.bus.findFirst({
    where: { id: busId, operatorId: operator.id },
    include: { seats: true, _count: { select: { schedules: true } } },
  });

  if (!bus) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(bus);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ busId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { busId } = await params;
  const bus = await prisma.bus.findFirst({ where: { id: busId, operatorId: operator.id } });
  if (!bus) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data = busSchema.parse(body);

  const updated = await prisma.bus.update({ where: { id: busId }, data });
  return NextResponse.json(updated);
}
