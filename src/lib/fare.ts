import type { Prisma } from "@prisma/client";
type Decimal = Prisma.Decimal;

const GST_RATE = 0.05; // 5% GST on bus fare
const CONVENIENCE_FEE = 30; // flat ₹30 convenience fee per booking

export interface FareBreakdown {
  baseFare: number;
  gstAmount: number;
  convenienceFee: number;
  discount: number;
  totalAmount: number;
}

export function calculateFare(
  pricePerSeat: number,
  seatCount: number,
  discount = 0
): FareBreakdown {
  const baseFare = pricePerSeat * seatCount;
  const gstAmount = Math.round(baseFare * GST_RATE * 100) / 100;
  const convenienceFee = CONVENIENCE_FEE;
  const totalAmount = baseFare + gstAmount + convenienceFee - discount;

  return {
    baseFare,
    gstAmount,
    convenienceFee,
    discount,
    totalAmount,
  };
}

export function calculateRefundAmount(
  totalPaid: number,
  departureTime: Date,
  policy: "FLEXIBLE" | "MODERATE" | "STRICT"
): number {
  const now = new Date();
  const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (policy === "STRICT") return 0;

  if (policy === "FLEXIBLE") {
    if (hoursUntilDeparture > 2) return totalPaid;
    return 0;
  }

  // MODERATE
  if (hoursUntilDeparture > 24) return totalPaid;
  if (hoursUntilDeparture > 6) return Math.round(totalPaid * 0.5 * 100) / 100;
  return 0;
}

export function calculateCommission(
  baseFare: number,
  commissionRate: number | Decimal
): { commissionAmt: number; gstOnCommission: number; netPayout: number } {
  const rate = typeof commissionRate === "number" ? commissionRate : Number(commissionRate);
  const commissionAmt = Math.round((baseFare * rate) / 100 * 100) / 100;
  const gstOnCommission = Math.round(commissionAmt * 0.18 * 100) / 100; // 18% GST on commission
  const netPayout = baseFare - commissionAmt - gstOnCommission;

  return { commissionAmt, gstOnCommission, netPayout };
}
