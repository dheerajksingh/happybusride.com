-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CAB_OPERATOR';

-- CreateTable
CREATE TABLE "cab_operators" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT NOT NULL,
    "vehicleReg" TEXT,
    "vehicleType" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "status" "ShuttleOperatorStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cab_operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cab_bookings" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "type" "ShuttleBookingType" NOT NULL,
    "address" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "ShuttleBookingStatus" NOT NULL DEFAULT 'PENDING',
    "cabOperatorId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cab_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cab_operators_userId_key" ON "cab_operators"("userId");

-- AddForeignKey
ALTER TABLE "cab_operators" ADD CONSTRAINT "cab_operators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cab_operators" ADD CONSTRAINT "cab_operators_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cab_bookings" ADD CONSTRAINT "cab_bookings_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cab_bookings" ADD CONSTRAINT "cab_bookings_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cab_bookings" ADD CONSTRAINT "cab_bookings_cabOperatorId_fkey" FOREIGN KEY ("cabOperatorId") REFERENCES "cab_operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;
