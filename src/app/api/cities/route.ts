import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").toLowerCase();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 500);

  const select = { id: true, name: true, state: true, code: true, latitude: true, longitude: true };

  // Prefix matches rank first; substring matches only fill the remaining
  // slots (so "delhi" still finds "New Delhi" after Delhi itself).
  const cities = await prisma.city.findMany({
    where: {
      isActive: true,
      ...(q ? { name: { startsWith: q, mode: "insensitive" } } : {}),
    },
    select,
    take: limit,
    orderBy: { name: "asc" },
  });

  if (q && cities.length < limit) {
    const rest = await prisma.city.findMany({
      where: {
        isActive: true,
        name: { contains: q, mode: "insensitive" },
        id: { notIn: cities.map((c) => c.id) },
      },
      select,
      take: limit - cities.length,
      orderBy: { name: "asc" },
    });
    cities.push(...rest);
  }

  return NextResponse.json(cities, {
    headers: {
      // CDN caches this response for 1 hour; browser re-validates after 5 min
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
    },
  });
}
