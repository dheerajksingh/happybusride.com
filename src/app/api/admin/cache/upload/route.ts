import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cacheSet } from "@/lib/cache";
import { Prisma } from "@prisma/client";

// ── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map((h) => h.toLowerCase().trim());

  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim() ?? ""]));
  });
}

function splitCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { values.push(current.replace(/^"|"$/g, "")); current = ""; }
    else { current += ch; }
  }
  values.push(current.replace(/^"|"$/g, ""));
  return values;
}

// ── Cache key handlers ───────────────────────────────────────────────────────

// Cities handler: normalises columns, upserts to DB, enriches rows with DB ids
async function handleCities(rows: Record<string, string>[]) {
  const normalised = rows
    .map((r) => ({
      name: (r.name || r.city || r.city_name || "").trim(),
      state: (r.state || r.state_name || "").trim(),
      latitude: parseFloat(r.latitude || r.lat || "") || null,
      longitude: parseFloat(r.longitude || r.lng || r.long || "") || null,
      code: (r.code || r.city_code || "").trim() || null,
    }))
    .filter((r) => r.name && r.state);

  // Deduplicate by (name, state) pair — keep first occurrence
  const seen = new Set<string>();
  const unique = normalised.filter((r) => {
    const key = `${r.name.toLowerCase()}|${r.state.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Null out all existing codes first so the unique constraint on code
  // doesn't fire when we reassign codes from the new CSV.
  await prisma.$executeRaw`UPDATE cities SET code = NULL`;

  // Bulk upsert using raw SQL — single query per chunk, no connection pool pressure.
  // Individual Prisma upserts (even batched) exhaust the 5-connection Lambda pool.
  const CHUNK = 200;
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    await prisma.$executeRaw`
      INSERT INTO cities (id, name, state, latitude, longitude, code, "isActive")
      VALUES ${Prisma.join(
        chunk.map((c) =>
          Prisma.sql`(gen_random_uuid()::text, ${c.name}, ${c.state}, ${c.latitude}, ${c.longitude}, ${c.code}, true)`
        )
      )}
      ON CONFLICT (name, state) DO UPDATE SET
        latitude  = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        code      = CASE WHEN EXCLUDED.code IS NOT NULL THEN EXCLUDED.code ELSE cities.code END
    `;
  }

  // Fetch all enriched records in one query to return IDs
  const enriched = await prisma.city.findMany({
    where: { name: { in: unique.map((c) => c.name) } },
    select: { id: true, name: true, state: true, code: true, latitude: true, longitude: true },
    orderBy: { name: "asc" },
  });

  return enriched;
}

// Default handler: store raw rows as-is
async function handleDefault(rows: Record<string, string>[]) {
  return rows;
}

// Registry — add new handlers here for future cache types
const HANDLERS: Record<string, (rows: Record<string, string>[]) => Promise<unknown[]>> = {
  cities: handleCities,
};

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const cacheKey = (formData.get("cacheKey") as string | null)?.trim().toLowerCase();

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!cacheKey) return NextResponse.json({ error: "cacheKey is required" }, { status: 400 });
  if (!/^[a-z0-9_-]+$/.test(cacheKey)) {
    return NextResponse.json({ error: "cacheKey must be lowercase alphanumeric with _ or -" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCSV(text);
  if (rows.length === 0) return NextResponse.json({ error: "CSV is empty or has no data rows" }, { status: 400 });

  const columns = Object.keys(rows[0]);
  const handler = HANDLERS[cacheKey] ?? handleDefault;

  let data: unknown[];
  try {
    data = await handler(rows);
  } catch (err) {
    console.error(`Cache upload error for key "${cacheKey}":`, err);
    return NextResponse.json({ error: "Failed to process CSV" }, { status: 500 });
  }

  await cacheSet(cacheKey, data, { count: data.length, columns, source: "csv" });

  return NextResponse.json({
    success: true,
    cacheKey,
    count: data.length,
    columns,
    dbSynced: cacheKey in HANDLERS,
  });
}
