import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  city: z.string().min(1),
  state: z.string().min(1),
  busType: z.string().optional(),
  seatCapacityMin: z.number().int().optional(),
  hasAc: z.boolean().default(false),
  hasWifi: z.boolean().default(false),
  officeAddress: z.string().min(5),
  officeLat: z.number().optional(),
  officeLng: z.number().optional(),
  arrivalTime: z.string(),
  departureTime: z.string(),
  maxTravelMins: z.number().int().optional(),
  clusterRadiusKm: z.number().positive().max(10).optional(),
  startDate: z.string(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "CORPORATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await prisma.corporateCharterRequest.findMany({
    where: { companyId: session.user.corporateCompanyId! },
    include: {
      _count: { select: { employees: true, bids: true } },
      company: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "CORPORATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const pricingRule = await prisma.corporatePricingRule.findFirst({
      where: {
        city: { equals: data.city, mode: "insensitive" },
        isActive: true,
        ...(data.busType ? { busType: data.busType as any } : {}),
      },
    });

    const request = await prisma.corporateCharterRequest.create({
      data: {
        companyId: session.user.corporateCompanyId!,
        createdById: session.user.id,
        city: data.city,
        state: data.state,
        busType: data.busType as any,
        seatCapacityMin: data.seatCapacityMin,
        hasAc: data.hasAc,
        hasWifi: data.hasWifi,
        officeAddress: data.officeAddress,
        officeLat: data.officeLat,
        officeLng: data.officeLng,
        arrivalTime: data.arrivalTime,
        departureTime: data.departureTime,
        maxTravelMins: data.maxTravelMins,
        clusterRadiusKm: data.clusterRadiusKm,
        startDate: new Date(data.startDate),
        notes: data.notes,
        status: "DRAFT",
        ...(pricingRule ? { suggestedPrice: pricingRule.ratePerKm } : {}),
      },
    });

    return NextResponse.json({ request }, { status: 201 });
  } catch (err: any) {
    if (err?.issues) return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}
