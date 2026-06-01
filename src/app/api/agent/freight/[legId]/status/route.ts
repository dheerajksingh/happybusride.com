import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Valid status transitions per leg type
const TRANSITIONS: Record<string, Record<string, string>> = {
  PENDING:        { AGENT_RECEIVED: "AGENT_RECEIVED" },
  AGENT_RECEIVED: { LOADED: "LOADED", COLLECTED: "COLLECTED" },
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ legId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { legId } = await params;
  const { action } = await req.json(); // "AGENT_RECEIVED" | "LOADED" | "COLLECTED"

  const leg = await prisma.freightLeg.findUnique({
    where: { id: legId },
    include: {
      booking: { include: { legs: { orderBy: { legOrder: "asc" } } } },
    },
  });

  if (!leg) return NextResponse.json({ error: "Leg not found" }, { status: 404 });
  if (leg.agentId !== session.user.agentId) {
    return NextResponse.json({ error: "Not your leg" }, { status: 403 });
  }

  const allowed = TRANSITIONS[leg.status];
  if (!allowed || !allowed[action]) {
    return NextResponse.json({ error: `Cannot transition from ${leg.status} to ${action}` }, { status: 400 });
  }

  // Validate COLLECTED only for FINAL, LOADED only for ORIGIN/INTERIM
  if (action === "COLLECTED" && leg.transferType !== "FINAL") {
    return NextResponse.json({ error: "Only FINAL legs can be collected" }, { status: 400 });
  }
  if (action === "LOADED" && leg.transferType === "FINAL") {
    return NextResponse.json({ error: "FINAL legs are collected, not loaded" }, { status: 400 });
  }

  const now = new Date();
  const timestamps: Record<string, Date> = {};
  if (action === "AGENT_RECEIVED") timestamps.receivedAt = now;
  if (action === "LOADED")         timestamps.loadedAt   = now;
  if (action === "COLLECTED")      timestamps.releasedAt = now;

  // Update the leg
  const updatedLeg = await prisma.freightLeg.update({
    where: { id: legId },
    data: { status: action as any, ...timestamps },
  });

  // Derive new booking status from all legs
  const allLegs = leg.booking.legs.map(l => (l.id === legId ? { ...l, status: action } : l));
  const finalLeg = allLegs.find(l => l.transferType === "FINAL");
  let newBookingStatus = leg.booking.status;

  if (finalLeg?.status === "COLLECTED") {
    newBookingStatus = "DELIVERED";
  } else if (finalLeg?.status === "AGENT_RECEIVED") {
    newBookingStatus = "AT_DESTINATION";
  } else if (allLegs.some(l => l.status === "AGENT_RECEIVED" && l.transferType === "INTERIM")) {
    newBookingStatus = "AT_AGENT";
  } else if (allLegs.some(l => l.status === "LOADED" || l.status === "IN_TRANSIT")) {
    newBookingStatus = "IN_TRANSIT";
  }

  await prisma.freightBooking.update({
    where: { id: leg.bookingId },
    data: { status: newBookingStatus as any },
  });

  // Create AgentEarning when leg is completed (LOADED for interim, COLLECTED for final)
  const isLegComplete = action === "LOADED" || action === "COLLECTED";
  if (isLegComplete) {
    const config = await prisma.agentChargeConfig.findFirst({ where: { isActive: true } });
    if (config && leg.agentId) {
      const freightCost = Number(leg.booking.freightCost);
      let pct = 0;
      let earningType: "FREIGHT_HANDLING_ORIGIN" | "FREIGHT_HANDLING_INTERIM" | "FREIGHT_HANDLING_FINAL" = "FREIGHT_HANDLING_INTERIM";

      if (leg.transferType === "ORIGIN")  { pct = Number(config.agentOriginPct);  earningType = "FREIGHT_HANDLING_ORIGIN"; }
      if (leg.transferType === "INTERIM") { pct = Number(config.agentInterimPct); earningType = "FREIGHT_HANDLING_INTERIM"; }
      if (leg.transferType === "FINAL")   {
        pct = Number(config.agentFinalPct);
        earningType = "FREIGHT_HANDLING_FINAL";
      }

      // For FINAL, add holding charges if any
      const holdingCharge = leg.transferType === "FINAL"
        ? Number(leg.holdingDays) * Number(config.perDayHoldingRate)
        : 0;

      const amount = (freightCost * pct) / 100 + holdingCharge;

      await prisma.agentEarning.create({
        data: {
          agentId:   leg.agentId,
          type:      earningType,
          amount,
          date:      now,
          referenceId: leg.bookingId,
        },
      });
    }
  }

  return NextResponse.json({ leg: updatedLeg, bookingStatus: newBookingStatus });
}
