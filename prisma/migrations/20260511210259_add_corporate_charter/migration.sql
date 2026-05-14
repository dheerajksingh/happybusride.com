-- CreateEnum
CREATE TYPE "CorporateRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'QUOTED', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CORPORATE';

-- CreateTable
CREATE TABLE "corporate_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "gstNumber" TEXT,
    "website" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "position" TEXT,

    CONSTRAINT "corporate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_charter_requests" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "busType" "BusType",
    "seatCapacityMin" INTEGER,
    "hasAc" BOOLEAN NOT NULL DEFAULT false,
    "hasWifi" BOOLEAN NOT NULL DEFAULT false,
    "officeAddress" TEXT NOT NULL,
    "officeLat" DECIMAL(10,7),
    "officeLng" DECIMAL(10,7),
    "arrivalTime" TEXT NOT NULL,
    "departureTime" TEXT NOT NULL,
    "maxTravelMins" INTEGER,
    "startDate" DATE NOT NULL,
    "status" "CorporateRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "estimatedKm" DECIMAL(10,2),
    "suggestedPrice" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_charter_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_employees" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "phone" TEXT,

    CONSTRAINT "corporate_employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_routes" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "distanceKm" DECIMAL(10,2) NOT NULL,
    "durationMins" INTEGER NOT NULL,

    CONSTRAINT "corporate_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_route_stops" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "stopOrder" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "employeeCount" INTEGER NOT NULL DEFAULT 0,
    "pickupTime" TEXT,

    CONSTRAINT "corporate_route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_operator_bids" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "status" "BidStatus" NOT NULL DEFAULT 'PENDING',
    "quoteAmount" DECIMAL(10,2),
    "quoteNote" TEXT,
    "quotedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_operator_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_chat_messages" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "corporate_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_absences" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_absences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_pricing_rules" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "busType" "BusType",
    "timeSlot" TEXT,
    "ratePerKm" DECIMAL(10,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "corporate_companies_phone_key" ON "corporate_companies"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_companies_email_key" ON "corporate_companies"("email");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_profiles_userId_key" ON "corporate_profiles"("userId");

-- CreateIndex
CREATE INDEX "corporate_charter_requests_companyId_idx" ON "corporate_charter_requests"("companyId");

-- CreateIndex
CREATE INDEX "corporate_employees_requestId_idx" ON "corporate_employees"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_route_stops_routeId_stopOrder_key" ON "corporate_route_stops"("routeId", "stopOrder");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_operator_bids_requestId_operatorId_key" ON "corporate_operator_bids"("requestId", "operatorId");

-- CreateIndex
CREATE INDEX "corporate_chat_messages_requestId_idx" ON "corporate_chat_messages"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_absences_employeeId_date_key" ON "employee_absences"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "corporate_profiles" ADD CONSTRAINT "corporate_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_profiles" ADD CONSTRAINT "corporate_profiles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "corporate_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_charter_requests" ADD CONSTRAINT "corporate_charter_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "corporate_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_employees" ADD CONSTRAINT "corporate_employees_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "corporate_charter_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_routes" ADD CONSTRAINT "corporate_routes_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "corporate_charter_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_route_stops" ADD CONSTRAINT "corporate_route_stops_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "corporate_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_operator_bids" ADD CONSTRAINT "corporate_operator_bids_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "corporate_charter_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_operator_bids" ADD CONSTRAINT "corporate_operator_bids_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_chat_messages" ADD CONSTRAINT "corporate_chat_messages_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "corporate_charter_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_chat_messages" ADD CONSTRAINT "corporate_chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_absences" ADD CONSTRAINT "employee_absences_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "corporate_employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
