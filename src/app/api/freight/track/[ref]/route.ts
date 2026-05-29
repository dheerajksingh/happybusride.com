import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;

  const booking = await prisma.freightBooking.findFirst({
    where: {
      OR: [
        { bookingRef: ref },
        { qrToken: ref },
      ],
    },
    include: {
      fromCity: { select: { name: true } },
      toCity:   { select: { name: true } },
      items:    true,
      legs: {
        orderBy: { legOrder: "asc" },
        include: {
          stop:   { include: { city: { select: { name: true } } } },
          toStop: { include: { city: { select: { name: true } } } },
          agent:  { select: { fullName: true, phone: true, whatsappNumber: true } },
          trip:   { select: { travelDate: true, status: true } },
        },
      },
    },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  return NextResponse.json({ booking });
}
