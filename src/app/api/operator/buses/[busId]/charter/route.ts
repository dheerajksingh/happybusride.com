import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  isCharterAvailable: z.boolean(),
  charterRatePerDay: z.number().positive().optional(),
  charterRatePerKm: z.number().positive().optional(),
  charterDepositPercent: z.number().min(10).max(100).optional(),
  charterCancelPolicy: z.string().optional(),
});

async function getOperatorBus(userId: string, busId: string) {
  const operator = await prisma.operator.findUnique({ where: { userId } });
  if (!operator) return null;
  const bus = await prisma.bus.findUnique({ where: { id: busId, operatorId: operator.id } });
  return bus;
}

export async function GET(_req: Request, { params }: { params: Promise<{ busId: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { busId } = await params;
    const bus = await getOperatorBus(session.user.id, busId);
    if (!bus) return NextResponse.json({ error: "Bus not found" }, { status: 404 });

    return NextResponse.json({
      isCharterAvailable: bus.isCharterAvailable,
      charterRatePerDay: bus.charterRatePerDay ? Number(bus.charterRatePerDay) : null,
      charterRatePerKm: bus.charterRatePerKm ? Number(bus.charterRatePerKm) : null,
      charterDepositPercent: bus.charterDepositPercent,
      charterCancelPolicy: bus.charterCancelPolicy,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ busId: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { busId } = await params;
    const bus = await getOperatorBus(session.user.id, busId);
    if (!bus) return NextResponse.json({ error: "Bus not found" }, { status: 404 });

    const body = await req.json();
    const data = schema.parse(body);

    if (data.isCharterAvailable) {
      if (!data.charterRatePerDay || !data.charterRatePerKm || !data.charterDepositPercent) {
        return NextResponse.json(
          { error: "Rate per day, rate per km, and deposit % are required when enabling charter" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.bus.update({
      where: { id: busId },
      data: {
        isCharterAvailable: data.isCharterAvailable,
        charterRatePerDay: data.charterRatePerDay ?? null,
        charterRatePerKm: data.charterRatePerKm ?? null,
        charterDepositPercent: data.charterDepositPercent ?? null,
        charterCancelPolicy: data.charterCancelPolicy ?? null,
      },
    });

    return NextResponse.json({
      isCharterAvailable: updated.isCharterAvailable,
      charterRatePerDay: updated.charterRatePerDay ? Number(updated.charterRatePerDay) : null,
      charterRatePerKm: updated.charterRatePerKm ? Number(updated.charterRatePerKm) : null,
      charterDepositPercent: updated.charterDepositPercent,
      charterCancelPolicy: updated.charterCancelPolicy,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
