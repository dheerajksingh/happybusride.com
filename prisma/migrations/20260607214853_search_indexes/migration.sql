-- CreateIndex
CREATE INDEX "route_stops_cityId_idx" ON "route_stops"("cityId");

-- CreateIndex
CREATE INDEX "route_stops_routeId_stopOrder_idx" ON "route_stops"("routeId", "stopOrder");

-- CreateIndex
CREATE INDEX "trips_travelDate_status_idx" ON "trips"("travelDate", "status");
