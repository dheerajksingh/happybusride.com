import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "OPERATOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) return NextResponse.json({ summary: {}, buses: [] });

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") ?? "monthly";

  // ── Passenger earnings ──────────────────────────────────────
  const passengerEarnings = await prisma.operatorEarning.findMany({
    where: { operatorId: operator.id },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  // Fetch bookings to get bus info for passenger earnings
  const bookingIds = passengerEarnings.map((e) => e.bookingId).filter(Boolean) as string[];
  const bookings = bookingIds.length
    ? await prisma.booking.findMany({
        where: { id: { in: bookingIds } },
        include: {
          trip: {
            include: {
              schedule: {
                include: { bus: { select: { id: true, name: true } } },
              },
            },
          },
        },
      })
    : [];
  const bookingBusMap = new Map<string, { id: string; name: string }>();
  for (const b of bookings) {
    const bus = b.trip?.schedule?.bus;
    if (bus) bookingBusMap.set(b.id, bus);
  }

  // ── Freight earnings ────────────────────────────────────────
  const freightLegs = await prisma.freightLeg.findMany({
    where: {
      trip: { schedule: { bus: { operatorId: operator.id } } },
      booking: {
        status: { in: ["CONFIRMED", "IN_TRANSIT", "AT_AGENT", "AT_DESTINATION", "DELIVERED"] },
      },
    },
    include: {
      booking: { select: { id: true, freightCost: true } },
      trip: {
        include: {
          schedule: { include: { bus: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  // Group freight legs by bookingId to compute proportional earnings
  const freightByBooking = new Map<
    string,
    { totalDist: number; legs: typeof freightLegs; freightCost: number; bus: { id: string; name: string } | null }
  >();
  for (const leg of freightLegs) {
    const bid = leg.bookingId;
    const bus = leg.trip?.schedule?.bus ?? null;
    if (!freightByBooking.has(bid)) {
      freightByBooking.set(bid, {
        totalDist: 0,
        legs: [],
        freightCost: Number(leg.booking.freightCost ?? 0),
        bus,
      });
    }
    const entry = freightByBooking.get(bid)!;
    entry.totalDist += Number(leg.distanceKm ?? 0);
    entry.legs.push(leg);
  }

  // ── Build per-bus aggregation map ──────────────────────────
  type BusPeriod = { label: string; passengerGross: number; freightEarnings: number };
  type BusEntry = {
    busId: string;
    busName: string;
    passengerGross: number;
    passengerNet: number;
    freightEarnings: number;
    periods: Map<string, BusPeriod>;
  };
  const busMap = new Map<string, BusEntry>();

  function getBusEntry(busId: string, busName: string): BusEntry {
    if (!busMap.has(busId)) {
      busMap.set(busId, {
        busId,
        busName,
        passengerGross: 0,
        passengerNet: 0,
        freightEarnings: 0,
        periods: new Map(),
      });
    }
    return busMap.get(busId)!;
  }

  function periodKey(date: Date): { key: string; label: string } {
    if (view === "daily") {
      return {
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      };
    }
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    };
  }

  for (const e of passengerEarnings) {
    const bus = e.bookingId ? bookingBusMap.get(e.bookingId) : undefined;
    const busId = bus?.id ?? "unknown";
    const busName = bus?.name ?? "Unknown Bus";
    const entry = getBusEntry(busId, busName);
    entry.passengerGross += Number(e.grossAmount);
    entry.passengerNet += Number(e.netPayout);
    const { key, label } = periodKey(new Date(e.createdAt));
    if (!entry.periods.has(key)) {
      entry.periods.set(key, { label, passengerGross: 0, freightEarnings: 0 });
    }
    const period = entry.periods.get(key)!;
    period.passengerGross += Number(e.grossAmount);
  }

  for (const [, fbEntry] of freightByBooking) {
    const { legs, totalDist, freightCost, bus } = fbEntry;
    if (!bus) continue;
    for (const leg of legs) {
      if (!leg.trip?.schedule?.bus) continue;
      const legDist = Number(leg.distanceKm ?? 0);
      const legEarning = totalDist > 0 ? (legDist / totalDist) * freightCost : 0;
      const entry = getBusEntry(bus.id, bus.name);
      entry.freightEarnings += legEarning;
      const { key, label } = periodKey(new Date());
      if (!entry.periods.has(key)) {
        entry.periods.set(key, { label, passengerGross: 0, freightEarnings: 0 });
      }
      entry.periods.get(key)!.freightEarnings += legEarning;
    }
  }

  const buses = [...busMap.values()].map((b) => ({
    busId: b.busId,
    busName: b.busName,
    passengerGross: Math.round(b.passengerGross),
    passengerNet: Math.round(b.passengerNet),
    freightEarnings: Math.round(b.freightEarnings),
    periods: [...b.periods.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([, p]) => ({
        label: p.label,
        passengerGross: Math.round(p.passengerGross),
        freightEarnings: Math.round(p.freightEarnings),
      })),
  }));

  const passengerGross = passengerEarnings.reduce((s, e) => s + Number(e.grossAmount), 0);
  const passengerNet = passengerEarnings.reduce((s, e) => s + Number(e.netPayout), 0);
  const freightEarnings = [...freightByBooking.values()].reduce((s, fb) => {
    return s + fb.freightCost;
  }, 0);

  return NextResponse.json({
    summary: {
      passengerGross: Math.round(passengerGross),
      passengerNet: Math.round(passengerNet),
      freightEarnings: Math.round(freightEarnings),
      totalNet: Math.round(passengerNet + freightEarnings),
    },
    buses,
  });
}
