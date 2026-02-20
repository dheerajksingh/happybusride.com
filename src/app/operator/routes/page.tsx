import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function RoutesPage() {
  const session = await auth();
  if (!session) redirect("/operator-login");

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) redirect("/operator/onboarding");

  const routes = await prisma.route.findMany({
    where: { operatorId: operator.id },
    include: {
      fromCity: { select: { name: true } },
      toCity: { select: { name: true } },
      stops: { orderBy: { stopOrder: "asc" } },
      _count: { select: { schedules: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Routes ({routes.length})</h1>
        <Link
          href="/operator/routes/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Add Route
        </Link>
      </div>

      {routes.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="mb-2 text-4xl">🗺️</p>
          <h3 className="font-semibold text-gray-900">No routes yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create your first route to start scheduling trips.</p>
          <Link href="/operator/routes/new" className="mt-4 inline-block text-sm font-medium text-blue-600">
            Add Route →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map((route) => (
            <div key={route.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {route.fromCity.name} → {route.toCity.name}
                </h3>
                <p className="text-sm text-gray-500">{route.name}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {route.stops.length} stops · {route._count.schedules} schedules
                  {route.distanceKm ? ` · ${route.distanceKm} km` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/operator/schedules/new?routeId=${route.id}`}
                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
                >
                  + Schedule
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
