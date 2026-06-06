import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminRoutesPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const routes = await prisma.route.findMany({
    include: {
      fromCity: { select: { name: true } },
      toCity: { select: { name: true } },
      stops: { orderBy: { stopOrder: "asc" }, include: { city: { select: { name: true } } } },
      _count: { select: { schedules: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Routes ({routes.length})</h1>
          <p className="text-sm text-gray-500">Admin-managed routes available to all operators</p>
        </div>
        <Link
          href="/admin/routes/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Add Route
        </Link>
      </div>

      {routes.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="mb-2 text-4xl">🗺️</p>
          <h3 className="font-semibold text-gray-900">No routes yet</h3>
          <p className="mt-1 text-sm text-gray-500">Create routes that operators can use to schedule their buses.</p>
          <Link href="/admin/routes/new" className="mt-4 inline-block text-sm font-medium text-blue-600">
            Add Route →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map((route) => (
            <div key={route.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">
                    {route.fromCity.name} → {route.toCity.name}
                  </h3>
                  {!route.operatorId && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Admin</span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${route.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {route.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{route.name}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {route.stops.length} stops · {route._count.schedules} schedules
                  {route.distanceKm ? ` · ${route.distanceKm} km` : ""}
                </p>
                <p className="text-xs text-gray-400">
                  Via: {route.stops.map((s) => s.city.name).join(" → ")}
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/admin/routes/${route.id}`}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
