// Mock payment gateway for development
// Replace with Razorpay/PhonePe SDK in production

export interface PaymentIntent {
  paymentId: string;
  amount: number;
  method: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  gatewayTxnId: string;
}

export async function initiatePayment(
  bookingId: string,
  amount: number,
  method: string
): Promise<PaymentIntent> {
  // Mock: immediately create a payment intent
  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  console.log(`[PAYMENT] Initiated: ${paymentId} | Amount: ₹${amount} | Method: ${method}`);

  return {
    paymentId,
    amount,
    method,
    status: "PENDING",
    gatewayTxnId: `gtxn_${Date.now()}`,
  };
}

export async function confirmPayment(
  paymentId: string
): Promise<{ success: boolean; gatewayTxnId: string }> {
  // Mock: always succeeds in development
  console.log(`[PAYMENT] Confirmed: ${paymentId}`);

  return {
    success: true,
    gatewayTxnId: `gtxn_confirmed_${Date.now()}`,
  };
}

export async function processRefund(
  gatewayTxnId: string,
  amount: number
): Promise<{ success: boolean; refundTxnId: string }> {
  console.log(`[REFUND] Processing: ${gatewayTxnId} | Amount: ₹${amount}`);

  return {
    success: true,
    refundTxnId: `ref_${Date.now()}`,
  };
}
