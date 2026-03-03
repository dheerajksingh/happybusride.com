/*
  Warnings:

  - A unique constraint covering the columns `[scheduleId,seatType,fromStopId,toStopId]` on the table `fare_rules` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('SERVICE', 'INSPECTION', 'REPAIR', 'CLEANING');

-- DropIndex
DROP INDEX "fare_rules_scheduleId_seatType_key";

-- AlterTable
ALTER TABLE "fare_rules" ADD COLUMN     "fromStopId" TEXT,
ADD COLUMN     "toStopId" TEXT;

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- CreateTable
CREATE TABLE "maintenance_logs" (
    "id" TEXT NOT NULL,
    "busId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "description" TEXT NOT NULL,
    "mileage" INTEGER,
    "cost" DECIMAL(10,2),
    "nextServiceDue" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maintenance_logs_busId_idx" ON "maintenance_logs"("busId");

-- CreateIndex
CREATE UNIQUE INDEX "fare_rules_scheduleId_seatType_fromStopId_toStopId_key" ON "fare_rules"("scheduleId", "seatType", "fromStopId", "toStopId");

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_busId_fkey" FOREIGN KEY ("busId") REFERENCES "buses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fare_rules" ADD CONSTRAINT "fare_rules_fromStopId_fkey" FOREIGN KEY ("fromStopId") REFERENCES "route_stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fare_rules" ADD CONSTRAINT "fare_rules_toStopId_fkey" FOREIGN KEY ("toStopId") REFERENCES "route_stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
