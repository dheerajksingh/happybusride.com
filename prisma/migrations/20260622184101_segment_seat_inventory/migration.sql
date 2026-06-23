-- DropIndex
DROP INDEX "bookings_seats_tripId_seatId_key";

-- DropIndex
DROP INDEX "seat_locks_tripId_seatId_key";

-- AlterTable
ALTER TABLE "seat_locks" ADD COLUMN     "boardingStopId" TEXT,
ADD COLUMN     "droppingStopId" TEXT;

-- CreateIndex
CREATE INDEX "bookings_seats_tripId_seatId_idx" ON "bookings_seats"("tripId", "seatId");

-- CreateIndex
CREATE INDEX "seat_locks_tripId_seatId_idx" ON "seat_locks"("tripId", "seatId");
