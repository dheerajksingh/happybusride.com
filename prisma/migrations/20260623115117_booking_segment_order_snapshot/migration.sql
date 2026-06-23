-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "boardingStopOrder" INTEGER,
ADD COLUMN     "droppingStopOrder" INTEGER;

-- Backfill existing bookings: snapshot the current stop order for any booking
-- that has boarding/dropping stops set. Captures the present (correct) ordering.
UPDATE "bookings" b
SET "boardingStopOrder" = rs."stopOrder"
FROM "route_stops" rs
WHERE rs."id" = b."boardingStopId" AND b."boardingStopOrder" IS NULL;

UPDATE "bookings" b
SET "droppingStopOrder" = rs."stopOrder"
FROM "route_stops" rs
WHERE rs."id" = b."droppingStopId" AND b."droppingStopOrder" IS NULL;
