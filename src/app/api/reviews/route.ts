import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const reviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data = reviewSchema.parse(body);

  const booking = await prisma.booking.findFirst({
    where: { id: data.bookingId, userId: session.user.id, status: "COMPLETED" },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found or not completed" }, { status: 404 });

  const review = await prisma.review.create({
    data: { ...data, userId: session.user.id, tags: data.tags ?? [] },
  });

  return NextResponse.json(review, { status: 201 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const scheduleId = searchParams.get("scheduleId");

  const reviews = await prisma.review.findMany({
    where: {
      isVisible: true,
      ...(scheduleId ? { booking: { trip: { scheduleId } } } : {}),
    },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(reviews);
}
