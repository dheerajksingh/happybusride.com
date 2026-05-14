import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

async function owns(id: string, companyId: string) {
  return prisma.corporateCharterRequest.findFirst({
    where: { id, companyId },
  });
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "CORPORATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const request = await prisma.corporateCharterRequest.findFirst({
    where: { id, companyId: session.user.corporateCompanyId! },
    include: {
      company: { select: { name: true, city: true } },
      employees: { orderBy: { name: "asc" } },
      routes: { include: { stops: { orderBy: { stopOrder: "asc" } } } },
      bids: {
        include: {
          operator: { select: { companyName: true, user: { select: { email: true, phone: true } } } },
        },
        orderBy: { createdAt: "desc" },
      },
      messages: {
        include: { sender: { select: { name: true, role: true } } },
        orderBy: { createdAt: "asc" },
        take: 100,
      },
    },
  });

  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ request });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "CORPORATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await owns(id, session.user.corporateCompanyId!);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  const updated = await prisma.corporateCharterRequest.update({
    where: { id },
    data: {
      // field edits
      city:           body.city           ?? undefined,
      state:          body.state          ?? undefined,
      officeAddress:  body.officeAddress  ?? undefined,
      officeLat:      body.officeLat      ?? undefined,
      officeLng:      body.officeLng      ?? undefined,
      arrivalTime:    body.arrivalTime    ?? undefined,
      departureTime:  body.departureTime  ?? undefined,
      maxTravelMins:   body.maxTravelMins   ?? undefined,
      clusterRadiusKm: body.clusterRadiusKm ?? undefined,
      startDate:      body.startDate ? new Date(body.startDate) : undefined,
      busType:        body.busType        ?? undefined,
      seatCapacityMin: body.seatCapacityMin ?? undefined,
      hasAc:          body.hasAc          ?? undefined,
      hasWifi:        body.hasWifi        ?? undefined,
      notes:          body.notes          ?? undefined,
      // status / internal
      status:         body.status         ?? undefined,
    },
  });

  return NextResponse.json({ request: updated });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "CORPORATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await owns(id, session.user.corporateCompanyId!);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Prevent deleting active/accepted requests
  if (["ACTIVE", "ACCEPTED"].includes(existing.status)) {
    return NextResponse.json(
      { error: "Cannot delete an active or accepted request. Cancel it first." },
      { status: 409 }
    );
  }

  await prisma.corporateCharterRequest.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
