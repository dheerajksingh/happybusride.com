-- AlterTable
ALTER TABLE "freight_bookings" ADD COLUMN     "senderName" TEXT,
ADD COLUMN     "senderPhone" TEXT;

-- Backfill existing bookings from the sender's user account so historical
-- bookings keep a sender contact where one exists (name may be null for
-- OTP passengers; phone is always present).
UPDATE "freight_bookings" fb
SET "senderName"  = u."name",
    "senderPhone" = u."phone"
FROM "users" u
WHERE u."id" = fb."senderId";
