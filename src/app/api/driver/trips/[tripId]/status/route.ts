import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "DRIVER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  const { tripId } = await params;
  const body = await req.json();
  const { status } = z.object({
    status: z.enum(["BOARDING", "IN_PROGRESS", "COMPLETED", "DELAYED", "CANCELLED"]),
  }).parse(body);

  const trip = await prisma.trip.findFirst({ where: { id: tripId, driverId: driver.id } });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: {
      status,
      ...(status === "IN_PROGRESS" ? { actualDeparture: new Date() } : {}),
      ...(status === "COMPLETED" ? { actualArrival: new Date() } : {}),
    },
  });

  if (status === "COMPLETED") {
    await prisma.booking.updateMany({
      where: { tripId, status: "CONFIRMED" },
      data: { status: "COMPLETED" },
    });
  }

  return NextResponse.json(updated);
}
