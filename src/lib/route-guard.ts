import { prisma } from "@/lib/prisma";

/**
 * True if a route has non-cancelled bookings on upcoming trips.
 *
 * Reordering, inserting, or removing a route's stops renumbers `stopOrder`,
 * which is the coordinate system segment-overlap math runs in. Existing
 * bookings snapshot their stop orders at booking time, so they stay internally
 * consistent — but a booking made before such an edit and one made after would
 * live in different coordinate systems. To avoid that, structural stop edits
 * are blocked while upcoming bookings exist. Past trips don't matter.
 */
export async function routeHasFutureBookings(routeId: string): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const count = await prisma.booking.count({
    where: {
      status: { notIn: ["CANCELLED_USER", "CANCELLED_OPERATOR", "REFUNDED"] },
      trip: { travelDate: { gte: today }, schedule: { routeId } },
    },
  });
  return count > 0;
}
