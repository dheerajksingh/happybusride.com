-- CreateEnum
CREATE TYPE "CharterBookingStatus" AS ENUM ('PENDING_DEPOSIT', 'CONFIRMED', 'CANCELLED_PASSENGER', 'CANCELLED_OPERATOR', 'COMPLETED');

-- AlterTable
ALTER TABLE "buses" ADD COLUMN     "charterCancelPolicy" TEXT,
ADD COLUMN     "charterDepositPercent" INTEGER,
ADD COLUMN     "charterRatePerDay" DECIMAL(10,2),
ADD COLUMN     "charterRatePerKm" DECIMAL(10,2),
ADD COLUMN     "isCharterAvailable" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "charter_bookings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "pnr" TEXT NOT NULL,
    "status" "CharterBookingStatus" NOT NULL DEFAULT 'PENDING_DEPOSIT',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "numDays" INTEGER NOT NULL,
    "estimatedKm" DECIMAL(10,2) NOT NULL,
    "ratePerDay" DECIMAL(10,2) NOT NULL,
    "ratePerKm" DECIMAL(10,2) NOT NULL,
    "depositPercent" INTEGER NOT NULL,
    "depositAmount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "pickupAddress" TEXT,
    "dropAddress" TEXT,
    "routeWaypoints" JSONB,
    "passengerCount" INTEGER NOT NULL DEFAULT 1,
    "purpose" TEXT,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "charter_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charter_payments" (
    "id" TEXT NOT NULL,
    "charterBookingId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "gatewayTxnId" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "charter_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "charter_bookings_pnr_key" ON "charter_bookings"("pnr");

-- CreateIndex
CREATE INDEX "charter_bookings_userId_idx" ON "charter_bookings"("userId");

-- CreateIndex
CREATE INDEX "charter_bookings_busId_idx" ON "charter_bookings"("busId");

-- CreateIndex
CREATE UNIQUE INDEX "charter_payments_charterBookingId_key" ON "charter_payments"("charterBookingId");

-- AddForeignKey
ALTER TABLE "charter_bookings" ADD CONSTRAINT "charter_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charter_bookings" ADD CONSTRAINT "charter_bookings_busId_fkey" FOREIGN KEY ("busId") REFERENCES "buses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charter_payments" ADD CONSTRAINT "charter_payments_charterBookingId_fkey" FOREIGN KEY ("charterBookingId") REFERENCES "charter_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
