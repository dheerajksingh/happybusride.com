import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "CORPORATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const bids = await prisma.corporateOperatorBid.findMany({
    where: { requestId: id, request: { companyId: session.user.corporateCompanyId! } },
    include: {
      operator: {
        select: {
          id: true,
          companyName: true,
          user: { select: { email: true, phone: true } },
          buses: { where: { isActive: true, isCharterAvailable: true }, select: { id: true, name: true, busType: true, totalSeats: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ bids });
}

// Accept a bid
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "CORPORATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { bidId } = await req.json();

  const request = await prisma.corporateCharterRequest.findFirst({
    where: { id, companyId: session.user.corporateCompanyId! },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.corporateOperatorBid.updateMany({
      where: { requestId: id, id: { not: bidId } },
      data: { status: "REJECTED", respondedAt: new Date() },
    }),
    prisma.corporateOperatorBid.update({
      where: { id: bidId },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    }),
    prisma.corporateCharterRequest.update({
      where: { id },
      data: { status: "ACCEPTED" },
    }),
  ]);

  return NextResponse.json({ success: true });
}
