import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export default async function SchedulesPage() {
  const session = await auth();
  if (!session) redirect("/operator-login");

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) redirect("/operator/onboarding");

  const schedules = await prisma.schedule.findMany({
    where: { route: { operatorId: operator.id } },
    include: {
      route: { include: { fromCity: true, toCity: true } },
      bus: { select: { name: true, busType: true } },
      _count: { select: { trips: true } },
    },
    orderBy: { departureTime: "asc" },
  });

  const fmt = (d: Date) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Schedules ({schedules.length})</h1>
        <Link
          href="/operator/schedules/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + New Schedule
        </Link>
      </div>

      {schedules.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="mb-2 text-4xl">⏰</p>
          <h3 className="font-semibold text-gray-900">No schedules yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create schedules to let passengers book tickets.</p>
          <Link href="/operator/schedules/new" className="mt-4 inline-block text-sm font-medium text-blue-600">
            Create Schedule →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Bus</th>
                <th className="px-4 py-3">Departure</th>
                <th className="px-4 py-3">Arrival</th>
                <th className="px-4 py-3">Base Fare</th>
                <th className="px-4 py-3">Trips</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {s.route.fromCity.name} → {s.route.toCity.name}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.bus.name}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{fmt(s.departureTime)}</td>
                  <td className="px-4 py-3 text-gray-600">{fmt(s.arrivalTime)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">₹{Number(s.baseFare)}</td>
                  <td className="px-4 py-3 text-gray-600">{s._count.trips}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
