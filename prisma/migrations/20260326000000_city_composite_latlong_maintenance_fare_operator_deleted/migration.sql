-- OperatorStatus: add DELETED value
ALTER TYPE "OperatorStatus" ADD VALUE IF NOT EXISTS 'DELETED';

-- cities: drop old name-only unique index, add lat/lng columns, add composite unique
DROP INDEX IF EXISTS "cities_name_key";
ALTER TABLE "cities"
  ADD COLUMN IF NOT EXISTS "latitude"  DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(10,7);
CREATE UNIQUE INDEX IF NOT EXISTS "cities_name_state_key" ON "cities"("name", "state");
