import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";

  const cities = await prisma.city.findMany({
    where: {
      isActive: true,
      name: { contains: q, mode: "insensitive" },
    },
    select: { id: true, name: true, state: true, code: true },
    take: 10,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(cities);
}
