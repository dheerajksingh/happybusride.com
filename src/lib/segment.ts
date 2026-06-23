// Per-segment fare + seat-inventory helpers for multi-stop trips.
//
// A trip runs origin → … → final through ordered RouteStops. A booking covers a
// segment [boardingStop, droppingStop). Two segments conflict only if their
// stop-order intervals overlap, so the same seat can be sold to different
// passengers on non-overlapping segments of one trip.

export type StopLite = {
  id: string;
  cityId: string;
  stopOrder: number;
  distanceFromOriginKm: number | null;
};

export type FareRuleLite = {
  fromStop?: { cityId: string } | null;
  toStop?:   { cityId: string } | null;
  price: unknown; // Prisma.Decimal | number | string
  isActive?: boolean;
};

export type Segment = {
  boardingStop: StopLite;
  droppingStop: StopLite;
  boardingOrder: number;
  droppingOrder: number;
};

function sortStops(stops: StopLite[]): StopLite[] {
  return [...stops].sort((a, b) => a.stopOrder - b.stopOrder);
}

/**
 * Resolve the boarding/dropping stops for a journey. Inputs may be city ids
 * (from search) or explicit stop ids; either is matched against the route's
 * stops. Falls back to the full route (first → last stop) when not provided or
 * not found — which keeps legacy/full-route behaviour intact.
 */
export function resolveSegment(
  stops: StopLite[],
  opts: { fromCityId?: string | null; toCityId?: string | null; boardingStopId?: string | null; droppingStopId?: string | null }
): Segment {
  const sorted = sortStops(stops);
  const first = sorted[0];
  const last  = sorted[sorted.length - 1];

  const boarding =
    (opts.boardingStopId ? sorted.find(s => s.id === opts.boardingStopId) : null) ??
    (opts.fromCityId     ? sorted.find(s => s.cityId === opts.fromCityId) : null) ??
    first;

  // Dropping stop must come after boarding; if a city repeats, take the first
  // matching stop after boarding.
  const dropping =
    (opts.droppingStopId ? sorted.find(s => s.id === opts.droppingStopId) : null) ??
    (opts.toCityId       ? sorted.find(s => s.cityId === opts.toCityId && s.stopOrder > boarding.stopOrder) : null) ??
    last;

  return {
    boardingStop: boarding,
    droppingStop: dropping,
    boardingOrder: boarding.stopOrder,
    droppingOrder: dropping.stopOrder,
  };
}

/**
 * Distance (km) of a segment: from cumulative stop distances when available,
 * else the stop-order share of the route distance. Clamped to [0, total] to
 * survive bad/non-monotonic route data (e.g. a later stop with a smaller
 * `distanceFromOriginKm`), which would otherwise yield a negative distance.
 */
export function segmentDistanceKm(totalDistanceKm: number, stops: StopLite[], seg: Segment): number {
  const fromDist = seg.boardingStop.distanceFromOriginKm;
  const toDist   = seg.droppingStop.distanceFromOriginKm;
  let d = (fromDist !== null && toDist !== null)
    ? toDist - fromDist
    : (stops.length > 1
        ? totalDistanceKm * (seg.droppingOrder - seg.boardingOrder) / (stops.length - 1)
        : totalDistanceKm);
  if (!Number.isFinite(d) || d < 0) d = 0;
  if (totalDistanceKm > 0 && d > totalDistanceKm) d = totalDistanceKm;
  return d;
}

/**
 * Per-seat fare for a segment: an exact stop-pair FareRule when present,
 * otherwise the base fare scaled by the segment's share of route distance.
 * The proportional fare is clamped to [0, full base fare] so bad data can never
 * produce a negative or above-full-route charge. Shared by /api/search,
 * /api/schedules/[id]/seats and /api/payments/initiate so quoted == charged.
 */
export function segmentFare(
  baseFare: number,
  totalDistanceKm: number,
  stops: StopLite[],
  seg: Segment,
  fareRules: FareRuleLite[],
): number {
  const fromCityId = seg.boardingStop.cityId;
  const toCityId   = seg.droppingStop.cityId;

  const exact = fareRules.find(
    r => (r.isActive ?? true) && r.fromStop?.cityId === fromCityId && r.toStop?.cityId === toCityId
  );
  if (exact) {
    const p = Number(exact.price);
    return Number.isFinite(p) && p >= 0 ? Math.round(p) : Math.round(baseFare);
  }

  const d = segmentDistanceKm(totalDistanceKm, stops, seg);
  const fare = totalDistanceKm > 0 ? Math.round(baseFare * d / totalDistanceKm) : baseFare;
  return Math.min(Math.max(0, fare), Math.round(baseFare));
}

/** Two half-open stop-order intervals [b, d) overlap. */
export function segmentsOverlap(b1: number, d1: number, b2: number, d2: number): boolean {
  return b1 < d2 && b2 < d1;
}

/**
 * Resolve an occupant's segment to a [board, drop) order interval. A null
 * boarding/dropping stop (legacy or full-route booking) spans the whole trip.
 */
export function occupantInterval(
  stops: StopLite[],
  boardingStopId: string | null,
  droppingStopId: string | null,
): { board: number; drop: number } {
  const sorted = sortStops(stops);
  const first = sorted[0]?.stopOrder ?? 0;
  const last  = sorted[sorted.length - 1]?.stopOrder ?? 0;
  const board = (boardingStopId ? sorted.find(s => s.id === boardingStopId)?.stopOrder : undefined) ?? first;
  const drop  = (droppingStopId ? sorted.find(s => s.id === droppingStopId)?.stopOrder : undefined) ?? last;
  return { board, drop };
}

/**
 * A booking's [board, drop) interval. Prefers the stop-order SNAPSHOT taken at
 * booking time (stable across later route edits); falls back to live stop
 * resolution for legacy bookings that predate the snapshot.
 */
export function bookingInterval(
  stops: StopLite[],
  b: { boardingStopOrder?: number | null; droppingStopOrder?: number | null; boardingStopId?: string | null; droppingStopId?: string | null },
): { board: number; drop: number } {
  if (b.boardingStopOrder != null && b.droppingStopOrder != null) {
    return { board: b.boardingStopOrder, drop: b.droppingStopOrder };
  }
  return occupantInterval(stops, b.boardingStopId ?? null, b.droppingStopId ?? null);
}
