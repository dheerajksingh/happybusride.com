import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "SHUTTLE_OPERATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const operator = await prisma.shuttleOperator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const vehicles = await prisma.shuttleVehicle.findMany({
    where: { shuttleOperatorId: operator.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ vehicles });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "SHUTTLE_OPERATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const operator = await prisma.shuttleOperator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const { vehicleType, regNo, name } = await req.json();
  if (!vehicleType || !regNo || !name) return NextResponse.json({ error: "vehicleType, regNo, name required" }, { status: 400 });

  const vehicle = await prisma.shuttleVehicle.create({
    data: { shuttleOperatorId: operator.id, vehicleType, regNo, name },
  });

  return NextResponse.json({ vehicle }, { status: 201 });
}
