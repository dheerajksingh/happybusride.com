import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BUS_TYPE_LABELS } from "@/constants/config";
import { Badge } from "@/components/ui/Badge";

export default async function BusesPage() {
  const session = await auth();
  if (!session) redirect("/operator-login");

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) redirect("/operator/onboarding");

  const buses = await prisma.bus.findMany({
    where: { operatorId: operator.id },
    include: { _count: { select: { seats: true, schedules: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bus Fleet</h1>
        <Link href="/operator/buses/new" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          + Add Bus
        </Link>
      </div>

      {buses.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="mb-2 text-4xl">🚌</p>
          <h3 className="font-semibold text-gray-900">No buses yet</h3>
          <p className="mt-1 text-sm text-gray-500">Add your first bus to get started.</p>
          <Link href="/operator/buses/new" className="mt-4 inline-block text-sm font-medium text-blue-600">
            Add Bus →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {buses.map((bus) => (
            <div key={bus.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{bus.name}</h3>
                <Badge variant={bus.isActive ? "success" : "default"}>
                  {bus.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="mb-1 text-sm text-gray-500">{bus.registrationNo}</p>
              <p className="mb-3 text-xs text-gray-400">
                {BUS_TYPE_LABELS[bus.busType]} · {bus._count.seats} seats · {bus._count.schedules} schedules
              </p>
              <div className="flex gap-2">
                <Link href={`/operator/buses/${bus.id}`} className="flex-1 rounded-lg border border-gray-300 py-1.5 text-center text-xs font-medium text-gray-700 hover:bg-gray-50">
                  Edit
                </Link>
                <Link href={`/operator/buses/${bus.id}/layout`} className="flex-1 rounded-lg border border-blue-200 py-1.5 text-center text-xs font-medium text-blue-600 hover:bg-blue-50">
                  Seat Layout
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
