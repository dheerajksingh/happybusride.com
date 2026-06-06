-- DropForeignKey
ALTER TABLE "routes" DROP CONSTRAINT "routes_operatorId_fkey";

-- AlterTable
ALTER TABLE "buses" ADD COLUMN     "charterOnly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "routes" ALTER COLUMN "operatorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "schedules" ADD COLUMN     "driverId" TEXT,
ADD COLUMN     "freightSpaces" JSONB;

-- CreateTable
CREATE TABLE "agent_operator_messages" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "fromAgent" BOOLEAN NOT NULL,
    "message" TEXT NOT NULL,
    "freightBookingId" TEXT,
    "isReadByAgent" BOOLEAN NOT NULL DEFAULT false,
    "isReadByOperator" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_operator_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_operator_messages_agentId_operatorId_idx" ON "agent_operator_messages"("agentId", "operatorId");

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_operator_messages" ADD CONSTRAINT "agent_operator_messages_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_operator_messages" ADD CONSTRAINT "agent_operator_messages_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
