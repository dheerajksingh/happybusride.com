import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const employeeSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(5),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phone: z.string().optional(),
});

const bulkSchema = z.object({
  employees: z.array(employeeSchema).min(1),
  replace: z.boolean().default(false),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !["CORPORATE", "OPERATOR"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // CORPORATE: scope to their company; OPERATOR: open (they need to see employees to plan routes)
  const where =
    session.user.role === "CORPORATE"
      ? { requestId: id, request: { companyId: session.user.corporateCompanyId! } }
      : { requestId: id };

  const employees = await prisma.corporateEmployee.findMany({
    where,
    include: { absences: { orderBy: { date: "asc" } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ employees });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "CORPORATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const request = await prisma.corporateCharterRequest.findFirst({
    where: { id, companyId: session.user.corporateCompanyId! },
  });
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const { employees, replace } = bulkSchema.parse(body);

    await prisma.$transaction(async (tx) => {
      if (replace) {
        await tx.corporateEmployee.deleteMany({ where: { requestId: id } });
      }
      await tx.corporateEmployee.createMany({
        data: employees.map((e) => ({ ...e, requestId: id })),
      });
    });

    const count = await prisma.corporateEmployee.count({ where: { requestId: id } });
    return NextResponse.json({ success: true, count }, { status: 201 });
  } catch (err: any) {
    if (err?.issues) return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    return NextResponse.json({ error: "Failed to add employees" }, { status: 500 });
  }
}
