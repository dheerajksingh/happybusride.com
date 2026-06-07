import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").toLowerCase();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 500);

  const cities = await prisma.city.findMany({
    where: {
      isActive: true,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    select: { id: true, name: true, state: true, code: true, latitude: true, longitude: true },
    take: limit,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(cities, {
    headers: {
      // CDN caches this response for 1 hour; browser re-validates after 5 min
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
    },
  });
}
