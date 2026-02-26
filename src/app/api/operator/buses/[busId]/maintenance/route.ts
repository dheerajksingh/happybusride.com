import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MaintenanceType } from "@prisma/client";

const logSchema = z.object({
  date: z.string(),
  type: z.nativeEnum(MaintenanceType),
  description: z.string().min(1),
  mileage: z.number().int().positive().optional(),
  cost: z.number().positive().optional(),
  nextServiceDue: z.string().optional(),
});

type Params = { params: Promise<{ busId: string }> };

async function verifyBusOwnership(busId: string, userId: string) {
  const operator = await prisma.operator.findUnique({ where: { userId } });
  if (!operator) return null;
  const bus = await prisma.bus.findFirst({ where: { id: busId, operatorId: operator.id } });
  return bus ? operator : null;
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { busId } = await params;
  const operator = await verifyBusOwnership(busId, session.user.id);
  if (!operator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const logs = await prisma.maintenanceLog.findMany({
    where: { busId },
    orderBy: { date: "desc" },
    take: 50,
  });

  return NextResponse.json(logs);
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { busId } = await params;
  const operator = await verifyBusOwnership(busId, session.user.id);
  if (!operator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data = logSchema.parse(body);

  const log = await prisma.maintenanceLog.create({
    data: {
      busId,
      date: new Date(data.date),
      type: data.type,
      description: data.description,
      mileage: data.mileage,
      cost: data.cost,
      nextServiceDue: data.nextServiceDue ? new Date(data.nextServiceDue) : undefined,
    },
  });

  return NextResponse.json(log, { status: 201 });
}
