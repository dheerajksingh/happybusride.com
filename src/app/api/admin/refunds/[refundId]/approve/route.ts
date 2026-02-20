import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processRefund } from "@/lib/payment";

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ refundId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { refundId } = await params;

  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: { booking: { include: { payment: true } } },
  });
  if (!refund) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { refundTxnId } = await processRefund(
    refund.booking.payment?.gatewayTxnId ?? "",
    Number(refund.amount)
  );

  await prisma.$transaction(async (tx) => {
    await tx.refund.update({
      where: { id: refundId },
      data: {
        status: "PROCESSED",
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        processedAt: new Date(),
        refundTxnId,
      },
    });

    await tx.booking.update({
      where: { id: refund.bookingId },
      data: { status: "REFUNDED" },
    });

    await tx.user.update({
      where: { id: refund.booking.userId },
      data: { walletBalance: { increment: refund.amount } },
    });

    await tx.walletTransaction.create({
      data: {
        userId: refund.booking.userId,
        type: "CREDIT",
        amount: refund.amount,
        description: `Refund for booking ${refund.bookingId}`,
        refBooking: refund.bookingId,
      },
    });
  });

  return NextResponse.json({ success: true });
}
