import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cacheKeys, cacheGetMeta, cacheDel } from "@/lib/cache";

// GET — list all cache keys with metadata
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await cacheKeys();
  const entries = await Promise.all(
    keys.map(async (key) => ({ key, meta: await cacheGetMeta(key) }))
  );

  return NextResponse.json({ entries });
}

// DELETE — clear all cache keys
export async function DELETE() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const keys = await cacheKeys();
  await Promise.all(keys.map((k) => cacheDel(k)));

  return NextResponse.json({ cleared: keys.length });
}
