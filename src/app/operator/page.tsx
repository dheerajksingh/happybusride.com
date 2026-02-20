import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

export default async function OperatorDashboardPage() {
  const session = await auth();
  if (!session) redirect("/operator-login");

  const operator = await prisma.operator.findUnique({
    where: { userId: session.user.id },
    include: {
      buses: { where: { isActive: true } },
      routes: { where: { isActive: true } },
      drivers: true,
    },
  });

  if (!operator) redirect("/operator/onboarding");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayTrips = await prisma.trip.findMany({
    where: {
      travelDate: today,
      schedule: { bus: { operatorId: operator.id } },
      status: { not: "CANCELLED" },
    },
    include: {
      schedule: {
        include: {
          route: { include: { fromCity: true, toCity: true } },
          bus: { select: { name: true } },
        },
      },
      _count: { select: { bookings: true } },
    },
    take: 5,
  });

  const earningsThisMonth = await prisma.operatorEarning.aggregate({
    where: {
      operatorId: operator.id,
      createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
    },
    _sum: { netPayout: true, grossAmount: true, commissionAmt: true },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">{operator.companyName}</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Buses", value: operator.buses.length, icon: "🚌" },
          { label: "Active Routes", value: operator.routes.length, icon: "🗺️" },
          { label: "Drivers", value: operator.drivers.length, icon: "👤" },
          {
            label: "This Month Earnings",
            value: `₹${(Number(earningsThisMonth._sum.netPayout ?? 0)).toLocaleString()}`,
            icon: "💰",
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-2xl">{s.icon}</div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Today's Trips */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Today&apos;s Trips</h2>
          <Link href="/operator/trips" className="text-sm text-blue-600 hover:underline">View All</Link>
        </div>

        {todayTrips.length === 0 ? (
          <p className="text-sm text-gray-400">No trips scheduled for today.</p>
        ) : (
          <div className="space-y-3">
            {todayTrips.map((trip) => (
              <div key={trip.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {trip.schedule.route.fromCity.name} → {trip.schedule.route.toCity.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {trip.schedule.bus.name} · {format(new Date(trip.schedule.departureTime), "HH:mm")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{trip._count.bookings} bookings</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    trip.status === "IN_PROGRESS" ? "bg-green-100 text-green-700" :
                    trip.status === "BOARDING" ? "bg-yellow-100 text-yellow-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {trip.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
