import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  tripId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "DRIVER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tripId, lat, lng } = schema.parse(body);

  await prisma.trip.update({
    where: { id: tripId },
    data: { currentLat: lat, currentLng: lng, lastLocationAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
