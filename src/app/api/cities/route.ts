import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cacheGet } from "@/lib/cache";

interface CachedCity {
  id: string;
  name: string;
  state: string;
  code: string | null;
  latitude: number | null;
  longitude: number | null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").toLowerCase();
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 500);

  // Redis-first: check cache:cities
  const cached = await cacheGet<CachedCity[]>("cities");

  if (cached && Array.isArray(cached)) {
    const results = cached
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q))
      .slice(0, limit);
    return NextResponse.json(results);
  }

  // DB fallback
  const cities = await prisma.city.findMany({
    where: {
      isActive: true,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    select: { id: true, name: true, state: true, code: true, latitude: true, longitude: true },
    take: limit,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(cities);
}
