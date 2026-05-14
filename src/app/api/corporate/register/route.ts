import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  companyName: z.string().min(2),
  companyAddress: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  gstNumber: z.string().optional(),
  companyPhone: z.string().min(10),
  companyEmail: z.string().email(),
  contactName: z.string().min(2),
  position: z.string().optional(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.companyEmail } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hash(data.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.corporateCompany.create({
        data: {
          name: data.companyName,
          address: data.companyAddress,
          city: data.city,
          state: data.state,
          gstNumber: data.gstNumber,
          phone: data.companyPhone,
          email: data.companyEmail,
        },
      });

      const user = await tx.user.create({
        data: {
          name: data.contactName,
          email: data.companyEmail,
          phone: data.companyPhone,
          passwordHash,
          role: "CORPORATE",
          corporateProfile: {
            create: {
              companyId: company.id,
              position: data.position,
            },
          },
        },
      });

      return { companyId: company.id, userId: user.id };
    });

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (err: any) {
    if (err?.issues) return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
