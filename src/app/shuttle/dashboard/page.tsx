import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const STATUS_STYLE: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-700",
  APPROVED:  "bg-green-100 text-green-700",
  REJECTED:  "bg-red-100 text-red-600",
  SUSPENDED: "bg-gray-100 text-gray-500",
};

export default async function ShuttleDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "SHUTTLE_OPERATOR") redirect("/shuttle/login");

  const operator = await prisma.shuttleOperator.findUnique({
    where: { userId: session.user.id },
    include: {
      city: { select: { name: true, state: true } },
      _count: { select: { vehicles: true, bookings: true } },
    },
  });

  if (!operator) redirect("/shuttle/login");

  const pendingBookings = await prisma.shuttleBooking.count({
    where: { shuttleOperatorId: operator.id, status: "PENDING" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {operator.fullName}</h1>
          <p className="text-sm text-gray-500">{operator.city.name}, {operator.city.state}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[operator.status]}`}>
          {operator.status}
        </span>
      </div>

      {operator.status === "PENDING" && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          ⏳ Your account is pending admin approval. You will be notified once approved.
        </div>
      )}

      <div className="mb-8 grid grid-cols-3 gap-4">
        {[
          { label: "Pending Bookings", value: pendingBookings, color: "text-orange-600" },
          { label: "Total Vehicles", value: operator._count.vehicles, color: "text-blue-700" },
          { label: "Total Bookings", value: operator._count.bookings, color: "text-green-700" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="mt-1 text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
