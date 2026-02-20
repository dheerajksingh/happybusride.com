import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { tripId } = await params;
  const body = await req.json();
  const { driverId } = z.object({ driverId: z.string() }).parse(body);

  // Verify driver belongs to operator
  const driver = await prisma.driver.findFirst({ where: { id: driverId, operatorId: operator.id } });
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: { driverId },
  });

  return NextResponse.json(trip);
}
