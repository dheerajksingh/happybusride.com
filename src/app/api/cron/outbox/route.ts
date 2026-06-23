import { NextRequest, NextResponse } from "next/server";
import { drainOutbox } from "@/lib/outbox-relay";

export const dynamic = "force-dynamic";

/**
 * Periodic outbox relay. Drains PENDING events (newly created ones the inline
 * kick missed, plus events whose previous send failed and were re-queued for
 * retry). Point a scheduler (EventBridge / cron) at this with the
 * `Authorization: Bearer <CRON_SECRET>` header.
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Relay not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Drain in batches until the queue is empty (bounded so a persistently
  // failing event can't spin forever within a single run).
  let total = 0;
  for (let i = 0; i < 20; i++) {
    const n = await drainOutbox();
    total += n;
    if (n === 0) break;
  }

  return NextResponse.json({ processed: total });
}

export const GET = handle;
export const POST = handle;
