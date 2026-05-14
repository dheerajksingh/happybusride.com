import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type Params = { params: Promise<{ id: string; empId: string }> };

async function verifyOwnership(requestId: string, empId: string, companyId: string) {
  return prisma.corporateEmployee.findFirst({
    where: { id: empId, requestId, request: { companyId } },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "CORPORATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, empId } = await params;
  const emp = await verifyOwnership(id, empId, session.user.corporateCompanyId!);
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);
    const updated = await prisma.corporateEmployee.update({ where: { id: empId }, data });
    return NextResponse.json({ employee: updated });
  } catch (err: any) {
    if (err?.issues) return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session || session.user.role !== "CORPORATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, empId } = await params;
  const emp = await verifyOwnership(id, empId, session.user.corporateCompanyId!);
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.corporateEmployee.delete({ where: { id: empId } });
  return NextResponse.json({ success: true });
}
