// Shared leg-builder for freight booking forms. Turns the legs of a search
// option into the leg payload sent to the booking API. Kept in one place so the
// passenger and agent walk-in booking pages stay in sync.

export type SearchLeg = {
  tripId:      string;
  fromStopId:  string;
  toStopId:    string;
  distanceKm:  number;
  destinationAgent?: { id: string } | null;
  agentCharge?: number;
};

export type SearchTransfer = { agentId?: string; agentCharge?: number };

export type BookingLeg = {
  tripId:       string;
  fromStopId:   string;
  toStopId:     string;
  distanceKm:   number;
  transferType: "ORIGIN" | "INTERIM" | "FINAL";
  agentId?:     string;
  agentCharge:  number;
};

/**
 * Build the leg payload from a search option.
 *
 * - First leg → ORIGIN (sending agent; assigned server-side from the origin city).
 * - Middle legs → INTERIM (transfer agents).
 * - Last leg → FINAL (receiving agent at the destination).
 *
 * Direct shipments are a single leg that is both first and last. We split that
 * into an ORIGIN leg and a FINAL leg on the same trip so BOTH the sending and
 * receiving agents are recorded — they each get notified, and the FINAL leg
 * lets the shipment progress through to delivery (a single ORIGIN leg can never
 * reach AT_DESTINATION / DELIVERED).
 */
export function buildBookingLegs(legs: SearchLeg[], transfers: SearchTransfer[] = [], originCharge = 0): BookingLeg[] {
  return legs.flatMap((leg, i) => {
    const isFirst = i === 0;
    const isFinal = i === legs.length - 1;
    const base = {
      tripId:     leg.tripId,
      fromStopId: leg.fromStopId,
      toStopId:   leg.toStopId,
      distanceKm: leg.distanceKm,
    };

    if (isFirst && isFinal && leg.destinationAgent?.id) {
      return [
        { ...base, transferType: "ORIGIN" as const, agentId: undefined,                  agentCharge: originCharge },
        { ...base, transferType: "FINAL"  as const, agentId: leg.destinationAgent.id,    agentCharge: leg.agentCharge ?? 0 },
      ];
    }

    return [{
      ...base,
      transferType: (isFirst ? "ORIGIN" : isFinal ? "FINAL" : "INTERIM") as BookingLeg["transferType"],
      agentId:      isFinal ? leg.destinationAgent?.id : (isFirst ? undefined : transfers[i - 1]?.agentId),
      agentCharge:  isFinal ? (leg.agentCharge ?? 0)   : (isFirst ? originCharge : (transfers[i - 1]?.agentCharge ?? 0)),
    }];
  });
}
