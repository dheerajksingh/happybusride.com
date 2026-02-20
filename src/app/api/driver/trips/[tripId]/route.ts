import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "DRIVER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  const { tripId } = await params;

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, driverId: driver.id },
    include: {
      schedule: {
        include: {
          route: {
            include: {
              fromCity: true,
              toCity: true,
              stops: { include: { city: true }, orderBy: { stopOrder: "asc" } },
            },
          },
          bus: true,
        },
      },
      bookings: {
        where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
        include: {
          user: { select: { name: true, phone: true } },
          passengers: true,
          seats: { include: { seat: true } },
        },
      },
    },
  });

  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(trip);
}
