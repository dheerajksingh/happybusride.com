-- CreateTable
CREATE TABLE "city_distances" (
    "id" TEXT NOT NULL,
    "fromCityId" TEXT NOT NULL,
    "toCityId" TEXT NOT NULL,
    "distanceKm" DECIMAL(8,1) NOT NULL,
    "durationMins" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'google',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "city_distances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "city_distances_fromCityId_toCityId_key" ON "city_distances"("fromCityId", "toCityId");

-- AddForeignKey
ALTER TABLE "city_distances" ADD CONSTRAINT "city_distances_fromCityId_fkey" FOREIGN KEY ("fromCityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city_distances" ADD CONSTRAINT "city_distances_toCityId_fkey" FOREIGN KEY ("toCityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
