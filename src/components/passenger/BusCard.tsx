import Link from "next/link";
import { format } from "date-fns";
import { BUS_TYPE_LABELS } from "@/constants/config";
import { Badge } from "@/components/ui/Badge";

interface SearchResult {
  scheduleId: string;
  tripId: string | null;
  route: {
    from: string;
    to: string;
    durationMins: number | null;
    distanceKm: number | null;
  };
  bus: {
    name: string;
    busType: string;
    totalSeats: number;
    amenities: string[];
  };
  departureTime: string;
  arrivalTime: string;
  baseFare: number;
  availableSeats: number;
}

export function BusCard({ result, date }: { result: SearchResult; date: string }) {
  const dep = new Date(result.departureTime);
  const arr = new Date(result.arrivalTime);
  const durationLabel = result.route.durationMins
    ? `${Math.floor(result.route.durationMins / 60)}h ${result.route.durationMins % 60}m`
    : null;

  const busTypeLabel = BUS_TYPE_LABELS[result.bus.busType] ?? result.bus.busType;
  const isAC = result.bus.busType.startsWith("AC");
  const isSleeper = result.bus.busType.includes("SLEEPER");

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Operator / Bus name */}
          <div className="mb-2 flex items-center gap-2">
            <span className="font-semibold text-gray-900">{result.bus.name}</span>
            <Badge variant={isAC ? "info" : "default"}>{busTypeLabel}</Badge>
            {isSleeper && <Badge variant="default">Sleeper</Badge>}
          </div>

          {/* Times */}
          <div className="flex items-center gap-3 text-sm">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{format(dep, "HH:mm")}</p>
              <p className="text-xs text-gray-500">{result.route.from}</p>
            </div>
            <div className="flex-1 text-center text-xs text-gray-400">
              {durationLabel && <p>{durationLabel}</p>}
              <div className="flex items-center gap-1">
                <div className="h-px flex-1 bg-gray-200" />
                <span>🚌</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              {result.route.distanceKm && <p>{result.route.distanceKm} km</p>}
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{format(arr, "HH:mm")}</p>
              <p className="text-xs text-gray-500">{result.route.to}</p>
            </div>
          </div>

          {/* Amenities */}
          {result.bus.amenities.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {result.bus.amenities.slice(0, 4).map((a) => (
                <span key={a} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 capitalize">
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Price & CTA */}
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-xs text-gray-500">Starting from</p>
            <p className="text-2xl font-bold text-gray-900">₹{Number(result.baseFare).toLocaleString()}</p>
          </div>
          <p className="text-xs text-gray-500">
            {result.availableSeats > 0 ? (
              <span className={result.availableSeats <= 5 ? "text-orange-600 font-semibold" : ""}>
                {result.availableSeats} seats left
              </span>
            ) : (
              <span className="text-red-600 font-semibold">Sold out</span>
            )}
          </p>
          {result.availableSeats > 0 ? (
            <Link
              href={`/bus/${result.scheduleId}?date=${date}`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Select Seats
            </Link>
          ) : (
            <button disabled className="cursor-not-allowed rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-400">
              Sold Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
