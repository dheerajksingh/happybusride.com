import { prisma } from "@/lib/prisma";

const LOCK_DURATION_MINUTES = 5;

export async function lockSeats(
  tripId: string,
  seatIds: string[],
  userId: string
): Promise<{ success: boolean; message?: string; expiresAt?: Date }> {
  // Clean up expired locks first
  await prisma.seatLock.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  const expiresAt = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);

  // Check if any seat is already locked or booked
  const conflicts = await prisma.seatLock.findMany({
    where: {
      tripId,
      seatId: { in: seatIds },
      expiresAt: { gte: new Date() },
      userId: { not: userId },
    },
  });

  if (conflicts.length > 0) {
    return { success: false, message: "One or more seats are no longer available." };
  }

  // Check if any seat is already booked
  const booked = await prisma.bookingsSeat.findMany({
    where: { tripId, seatId: { in: seatIds } },
  });

  if (booked.length > 0) {
    return { success: false, message: "One or more seats are already booked." };
  }

  // Upsert locks for this user
  await prisma.$transaction(
    seatIds.map((seatId) =>
      prisma.seatLock.upsert({
        where: { tripId_seatId: { tripId, seatId } },
        create: { tripId, seatId, userId, expiresAt },
        update: { userId, expiresAt },
      })
    )
  );

  return { success: true, expiresAt };
}

export async function releaseSeats(tripId: string, seatIds: string[], userId: string) {
  await prisma.seatLock.deleteMany({
    where: { tripId, seatId: { in: seatIds }, userId },
  });
}

export async function getUserLock(
  tripId: string,
  userId: string
): Promise<{ seatIds: string[]; expiresAt: Date | null }> {
  const locks = await prisma.seatLock.findMany({
    where: { tripId, userId, expiresAt: { gte: new Date() } },
  });

  return {
    seatIds: locks.map((l) => l.seatId),
    expiresAt: locks[0]?.expiresAt ?? null,
  };
}
