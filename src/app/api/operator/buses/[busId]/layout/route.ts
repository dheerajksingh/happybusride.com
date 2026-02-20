import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SeatType } from "@prisma/client";

const layoutSchema = z.object({
  rows: z.number().min(1).max(20),
  columns: z.array(z.string()),
  decks: z.array(z.string()).optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ busId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { busId } = await params;
  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const bus = await prisma.bus.findFirst({ where: { id: busId, operatorId: operator.id } });
  if (!bus) return NextResponse.json({ error: "Bus not found" }, { status: 404 });

  const body = await req.json();
  const layoutConfig = layoutSchema.parse(body);

  // Delete existing seats and recreate from layout
  await prisma.seat.deleteMany({ where: { busId } });

  const seatCols = layoutConfig.columns.filter((c) => c !== "_");
  const decks = layoutConfig.decks ?? ["lower"];
  const seats: { busId: string; seatNumber: string; seatType: SeatType; row: number; column: string; deck: string }[] = [];

  for (const deck of decks) {
    for (let row = 1; row <= layoutConfig.rows; row++) {
      for (const col of seatCols) {
        const seatNum = decks.length > 1
          ? `${deck === "upper" ? "U" : "L"}${row}${col}`
          : `${row}${col}`;
        const seatType: SeatType = bus.busType.includes("SLEEPER")
          ? (deck === "upper" ? SeatType.UPPER : SeatType.LOWER)
          : SeatType.SEATER;
        seats.push({ busId, seatNumber: seatNum, seatType, row, column: col, deck });
      }
    }
  }

  await prisma.seat.createMany({ data: seats });

  const updated = await prisma.bus.update({
    where: { id: busId },
    data: { layoutConfig, totalSeats: seats.length },
  });

  return NextResponse.json({ success: true, bus: updated, seatsCreated: seats.length });
}
