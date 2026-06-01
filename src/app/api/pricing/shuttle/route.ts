import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const distanceKm = parseFloat(searchParams.get("distanceKm") ?? "10");
  const vehicleType = searchParams.get("vehicleType") ?? "SEATER_8";

  const config = await prisma.shuttlePricingConfig.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (config?.generatedFn) {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("distanceKm", "vehicleType", config.generatedFn);
      const price = fn(distanceKm, vehicleType);
      if (typeof price === "number" && price > 0) {
        return NextResponse.json({ price: Math.round(price) });
      }
    } catch {
      // fall through
    }
  }

  // Fallback: max(₹80, ₹8 * distanceKm)
  const price = Math.max(80, Math.round(8 * distanceKm));
  return NextResponse.json({ price });
}
