import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const excessKg = parseFloat(searchParams.get("excessKg") ?? "0");
  const distanceKm = parseFloat(searchParams.get("distanceKm") ?? "0");

  if (excessKg <= 0) return NextResponse.json({ charge: 0 });

  const config = await prisma.extraLuggagePricingConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (config?.generatedFn) {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("excessWeightKg", "distanceKm", config.generatedFn);
      const price = fn(excessKg, distanceKm);
      if (typeof price === "number" && price >= 0) {
        return NextResponse.json({ charge: Math.round(price) });
      }
    } catch {
      // fall through
    }
  }

  // Fallback formula: ₹10/excess kg + ₹0.05/km per kg
  const charge = Math.round(10 * excessKg + 0.05 * distanceKm * excessKg);
  return NextResponse.json({ charge });
}
