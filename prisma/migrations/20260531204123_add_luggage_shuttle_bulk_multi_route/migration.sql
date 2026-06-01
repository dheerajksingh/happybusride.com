-- CreateEnum
CREATE TYPE "ShuttleOperatorStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ShuttleVehicleType" AS ENUM ('SEATER_6', 'SEATER_8', 'SEATER_10');

-- CreateEnum
CREATE TYPE "ShuttleBookingType" AS ENUM ('PICKUP', 'DROPOFF');

-- CreateEnum
CREATE TYPE "ShuttleBookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SHUTTLE_OPERATOR';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "bulkGroupId" TEXT,
ADD COLUMN     "connectingGroupId" TEXT,
ADD COLUMN     "extraLuggageCharge" DECIMAL(10,2),
ADD COLUMN     "extraLuggageWeightKg" DECIMAL(6,2);

-- CreateTable
CREATE TABLE "extra_luggage_pricing_configs" (
    "id" TEXT NOT NULL,
    "pricingText" TEXT NOT NULL,
    "generatedFn" TEXT,
    "generatedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extra_luggage_pricing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shuttle_pricing_configs" (
    "id" TEXT NOT NULL,
    "pricingText" TEXT NOT NULL,
    "generatedFn" TEXT,
    "generatedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shuttle_pricing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cab_pricing_configs" (
    "id" TEXT NOT NULL,
    "pricingText" TEXT NOT NULL,
    "generatedFn" TEXT,
    "generatedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cab_pricing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shuttle_operators" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT NOT NULL,
    "panDocUrl" TEXT,
    "regNo" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "status" "ShuttleOperatorStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shuttle_operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shuttle_vehicles" (
    "id" TEXT NOT NULL,
    "shuttleOperatorId" TEXT NOT NULL,
    "vehicleType" "ShuttleVehicleType" NOT NULL,
    "regNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shuttle_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shuttle_bookings" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "ShuttleBookingType" NOT NULL,
    "address" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "ShuttleBookingStatus" NOT NULL DEFAULT 'PENDING',
    "shuttleOperatorId" TEXT,
    "vehicleId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shuttle_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_booking_groups" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "initiatedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_booking_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connecting_booking_groups" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connecting_booking_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shuttle_operators_userId_key" ON "shuttle_operators"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "shuttle_vehicles_regNo_key" ON "shuttle_vehicles"("regNo");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_bulkGroupId_fkey" FOREIGN KEY ("bulkGroupId") REFERENCES "bulk_booking_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_connectingGroupId_fkey" FOREIGN KEY ("connectingGroupId") REFERENCES "connecting_booking_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shuttle_operators" ADD CONSTRAINT "shuttle_operators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shuttle_operators" ADD CONSTRAINT "shuttle_operators_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shuttle_vehicles" ADD CONSTRAINT "shuttle_vehicles_shuttleOperatorId_fkey" FOREIGN KEY ("shuttleOperatorId") REFERENCES "shuttle_operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shuttle_bookings" ADD CONSTRAINT "shuttle_bookings_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shuttle_bookings" ADD CONSTRAINT "shuttle_bookings_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shuttle_bookings" ADD CONSTRAINT "shuttle_bookings_shuttleOperatorId_fkey" FOREIGN KEY ("shuttleOperatorId") REFERENCES "shuttle_operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shuttle_bookings" ADD CONSTRAINT "shuttle_bookings_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "shuttle_vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
