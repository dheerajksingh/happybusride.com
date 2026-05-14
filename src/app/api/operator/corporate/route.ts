import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  // Show submitted requests in the same city as operator's buses
  const operatorCities = await prisma.bus.findMany({
    where: { operatorId: operator.id },
    select: { id: true },
  });

  const requests = await prisma.corporateCharterRequest.findMany({
    where: { status: { in: ["SUBMITTED", "QUOTED", "ACCEPTED"] } },
    include: {
      company: { select: { name: true, city: true, state: true } },
      _count: { select: { employees: true } },
      bids: { where: { operatorId: operator.id }, select: { id: true, status: true, quoteAmount: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ requests, operatorId: operator.id });
}

// Submit a bid / quote
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const { requestId, quoteAmount, quoteNote } = await req.json();

  const existing = await prisma.corporateOperatorBid.findUnique({
    where: { requestId_operatorId: { requestId, operatorId: operator.id } },
  });

  const bid = existing
    ? await prisma.corporateOperatorBid.update({
        where: { id: existing.id },
        data: { quoteAmount, quoteNote, status: "PENDING", quotedAt: new Date() },
      })
    : await prisma.corporateOperatorBid.create({
        data: { requestId, operatorId: operator.id, quoteAmount, quoteNote, quotedAt: new Date() },
      });

  // Update request status to QUOTED if still SUBMITTED
  await prisma.corporateCharterRequest.updateMany({
    where: { id: requestId, status: "SUBMITTED" },
    data: { status: "QUOTED" },
  });

  return NextResponse.json({ bid }, { status: 201 });
}
