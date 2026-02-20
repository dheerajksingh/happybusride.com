import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "DRIVER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const attendance = await prisma.driverAttendance.upsert({
    where: { driverId_date: { driverId: driver.id, date: today } },
    update: { checkedIn: true, checkInAt: new Date() },
    create: { driverId: driver.id, date: today, checkedIn: true, checkInAt: new Date() },
  });

  return NextResponse.json(attendance);
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "DRIVER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return NextResponse.json([]);

  const records = await prisma.driverAttendance.findMany({
    where: { driverId: driver.id },
    orderBy: { date: "desc" },
    take: 30,
  });

  return NextResponse.json(records);
}
