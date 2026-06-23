import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getMobileSession } from "@/lib/mobile-auth";
import { lockSeats, releaseSeats } from "@/lib/seat-lock";

const lockSchema = z.object({
  tripId: z.string().min(1),
  seatIds: z.array(z.string()).min(1).max(6),
  boardingStopId: z.string().optional(),
  droppingStopId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = (await auth()) ?? (await getMobileSession(req));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tripId, seatIds, boardingStopId, droppingStopId } = lockSchema.parse(body);

    const result = await lockSeats(tripId, seatIds, session.user.id, { boardingStopId, droppingStopId });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 409 });
    }

    return NextResponse.json({ success: true, expiresAt: result.expiresAt });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = (await auth()) ?? (await getMobileSession(req));
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tripId, seatIds } = lockSchema.parse(body);

    await releaseSeats(tripId, seatIds, session.user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
