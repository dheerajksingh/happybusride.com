import { calculateFare } from "@/lib/fare";

interface FareBreakdownProps {
  pricePerSeat: number;
  seatCount: number;
  discount?: number;
}

export function FareBreakdown({ pricePerSeat, seatCount, discount = 0 }: FareBreakdownProps) {
  const fare = calculateFare(pricePerSeat, seatCount, discount);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
      <h3 className="mb-3 font-semibold text-gray-900">Fare Breakdown</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-gray-600">
          <span>Base fare ({seatCount} × ₹{pricePerSeat.toLocaleString()})</span>
          <span>₹{fare.baseFare.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>GST (5%)</span>
          <span>₹{fare.gstAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Convenience fee</span>
          <span>₹{fare.convenienceFee}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-₹{discount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900">
          <span>Total</span>
          <span>₹{fare.totalAmount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
