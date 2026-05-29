import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { configId } = await req.json();
  if (!configId) return NextResponse.json({ error: "configId required" }, { status: 400 });

  const config = await prisma.freightPricingConfig.findUnique({ where: { id: configId } });
  if (!config) return NextResponse.json({ error: "Config not found" }, { status: 404 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const prompt = `You are a pricing function generator for a freight/cargo booking system.

Given the following pricing table defined by an admin:

${config.pricingText}

Generate a JavaScript function body (not a full function declaration, just the body) that:
1. Takes three parameters: weightKg (number), volumeCm3 (number), distanceKm (number)
2. Returns a price in Indian Rupees (number) based on the pricing table above
3. Interpolates or extrapolates for values between/outside the table
4. Uses only basic JavaScript (no imports, no external libraries)

The function body will be used like this:
  const fn = new Function('weightKg', 'volumeCm3', 'distanceKm', YOUR_FUNCTION_BODY);
  const price = fn(weightKg, volumeCm3, distanceKm);

Return ONLY the JavaScript function body code, no explanation, no markdown, no code fences.`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const fnBody = (message.content[0] as any).text?.trim() ?? "";
    if (!fnBody) return NextResponse.json({ error: "Claude returned empty response" }, { status: 502 });

    // Validate the generated function
    try {
      // eslint-disable-next-line no-new-func
      const testFn = new Function("weightKg", "volumeCm3", "distanceKm", fnBody);
      const testResult = testFn(10, 30000, 100);
      if (typeof testResult !== "number" || testResult <= 0) throw new Error("Invalid result");
    } catch {
      return NextResponse.json({ error: "Generated function is invalid — please refine pricing text and try again" }, { status: 422 });
    }

    // Save + activate
    const updated = await prisma.freightPricingConfig.update({
      where: { id: configId },
      data: { generatedFn: fnBody, generatedAt: new Date(), isActive: true },
    });

    return NextResponse.json({ config: updated, preview: `Test (10kg, 30L, 100km): ₹${new Function("weightKg", "volumeCm3", "distanceKm", fnBody)(10, 30000, 100)}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Generation failed" }, { status: 500 });
  }
}
