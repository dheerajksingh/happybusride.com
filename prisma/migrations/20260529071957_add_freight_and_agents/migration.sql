-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "FreightStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'IN_TRANSIT', 'AT_AGENT', 'AT_DESTINATION', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FreightLegStatus" AS ENUM ('PENDING', 'AGENT_RECEIVED', 'LOADED', 'IN_TRANSIT', 'AGENT_AT_NEXT', 'COLLECTED');

-- CreateEnum
CREATE TYPE "FreightTransferType" AS ENUM ('ORIGIN', 'INTERIM', 'FINAL');

-- CreateEnum
CREATE TYPE "AgentEarningType" AS ENUM ('SEAT_COMMISSION', 'FREIGHT_COMMISSION', 'FREIGHT_HANDLING_ORIGIN', 'FREIGHT_HANDLING_INTERIM', 'FREIGHT_HANDLING_FINAL');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'AGENT';

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "panNumber" TEXT,
    "aadhaarNumber" TEXT,
    "panDocUrl" TEXT,
    "aadhaarDocUrl" TEXT,
    "phone" TEXT NOT NULL,
    "whatsappNumber" TEXT,
    "status" "AgentStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_operators" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_passenger_bookings" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "commission" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_passenger_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_earnings" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" "AgentEarningType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "referenceId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_charge_configs" (
    "id" TEXT NOT NULL,
    "agentOriginPct" DECIMAL(5,2) NOT NULL,
    "agentInterimPct" DECIMAL(5,2) NOT NULL,
    "agentFinalPct" DECIMAL(5,2) NOT NULL,
    "agentSeatBookingComm" DECIMAL(5,2) NOT NULL,
    "agentFreightComm" DECIMAL(5,2) NOT NULL,
    "perDayHoldingRate" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_charge_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freight_pricing_configs" (
    "id" TEXT NOT NULL,
    "pricingText" TEXT NOT NULL,
    "generatedFn" TEXT,
    "generatedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "freight_pricing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freight_bookings" (
    "id" TEXT NOT NULL,
    "bookingRef" TEXT NOT NULL,
    "status" "FreightStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "senderId" TEXT NOT NULL,
    "bookedByAgentId" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientWhatsapp" TEXT,
    "recipientEmail" TEXT,
    "recipientAddress" TEXT NOT NULL,
    "fromCityId" TEXT NOT NULL,
    "toCityId" TEXT NOT NULL,
    "shippingDate" DATE NOT NULL,
    "freightCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "agentCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "qrToken" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "freight_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freight_items" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "weightKg" DECIMAL(6,2) NOT NULL,
    "lengthCm" INTEGER NOT NULL,
    "breadthCm" INTEGER NOT NULL,
    "heightCm" INTEGER NOT NULL,

    CONSTRAINT "freight_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freight_legs" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "legOrder" INTEGER NOT NULL,
    "stopId" TEXT NOT NULL,
    "transferType" "FreightTransferType" NOT NULL,
    "agentId" TEXT,
    "holdingDays" INTEGER NOT NULL DEFAULT 0,
    "agentCharge" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tripId" TEXT,
    "toStopId" TEXT,
    "distanceKm" DECIMAL(8,2),
    "status" "FreightLegStatus" NOT NULL DEFAULT 'PENDING',
    "receivedAt" TIMESTAMP(3),
    "loadedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "freight_legs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freight_payments" (
    "id" TEXT NOT NULL,
    "freightBookingId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "gatewayTxnId" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "freight_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agents_userId_key" ON "agents"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_operators_agentId_operatorId_key" ON "agent_operators"("agentId", "operatorId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_passenger_bookings_bookingId_key" ON "agent_passenger_bookings"("bookingId");

-- CreateIndex
CREATE INDEX "agent_earnings_agentId_date_idx" ON "agent_earnings"("agentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "freight_bookings_bookingRef_key" ON "freight_bookings"("bookingRef");

-- CreateIndex
CREATE UNIQUE INDEX "freight_bookings_qrToken_key" ON "freight_bookings"("qrToken");

-- CreateIndex
CREATE INDEX "freight_bookings_senderId_idx" ON "freight_bookings"("senderId");

-- CreateIndex
CREATE INDEX "freight_bookings_fromCityId_toCityId_shippingDate_idx" ON "freight_bookings"("fromCityId", "toCityId", "shippingDate");

-- CreateIndex
CREATE UNIQUE INDEX "freight_legs_bookingId_legOrder_key" ON "freight_legs"("bookingId", "legOrder");

-- CreateIndex
CREATE UNIQUE INDEX "freight_payments_freightBookingId_key" ON "freight_payments"("freightBookingId");

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_operators" ADD CONSTRAINT "agent_operators_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_operators" ADD CONSTRAINT "agent_operators_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_passenger_bookings" ADD CONSTRAINT "agent_passenger_bookings_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_passenger_bookings" ADD CONSTRAINT "agent_passenger_bookings_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_earnings" ADD CONSTRAINT "agent_earnings_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freight_bookings" ADD CONSTRAINT "freight_bookings_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freight_bookings" ADD CONSTRAINT "freight_bookings_bookedByAgentId_fkey" FOREIGN KEY ("bookedByAgentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freight_bookings" ADD CONSTRAINT "freight_bookings_fromCityId_fkey" FOREIGN KEY ("fromCityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freight_bookings" ADD CONSTRAINT "freight_bookings_toCityId_fkey" FOREIGN KEY ("toCityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freight_items" ADD CONSTRAINT "freight_items_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "freight_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freight_legs" ADD CONSTRAINT "freight_legs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "freight_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freight_legs" ADD CONSTRAINT "freight_legs_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "route_stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freight_legs" ADD CONSTRAINT "freight_legs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freight_legs" ADD CONSTRAINT "freight_legs_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freight_legs" ADD CONSTRAINT "freight_legs_toStopId_fkey" FOREIGN KEY ("toStopId") REFERENCES "route_stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freight_payments" ADD CONSTRAINT "freight_payments_freightBookingId_fkey" FOREIGN KEY ("freightBookingId") REFERENCES "freight_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
