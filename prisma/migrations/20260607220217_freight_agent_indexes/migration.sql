-- CreateIndex
CREATE INDEX "agents_cityId_status_idx" ON "agents"("cityId", "status");

-- CreateIndex
CREATE INDEX "freight_legs_tripId_idx" ON "freight_legs"("tripId");
