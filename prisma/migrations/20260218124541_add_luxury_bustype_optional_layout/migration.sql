-- AlterEnum
ALTER TYPE "BusType" ADD VALUE 'LUXURY';

-- AlterTable
ALTER TABLE "buses" ALTER COLUMN "layoutConfig" DROP NOT NULL;
