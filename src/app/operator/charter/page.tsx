import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import { BUS_TYPE_LABELS } from "@/constants/config";

const STATUS_BADGE: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  PENDING_DEPOSIT: { label: "Pending Deposit", variant: "warning" },
  CONFIRMED: { label: "Confirmed", variant: "success" },
  CANCELLED_PASSENGER: { label: "Cancelled", variant: "danger" },
  CANCELLED_OPERATOR: { label: "Cancelled", variant: "danger" },
  COMPLETED: { label: "Completed", variant: "default" },
};

export default async function OperatorCharterPage() {
  const session = await auth();
  if (!session) redirect("/operator-login");

  const operator = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!operator) redirect("/operator/onboarding");

  const bookings = await prisma.charterBooking.findMany({
    where: { bus: { operatorId: operator.id } },
    include: {
      user: { select: { name: true, phone: true, email: true } },
      bus: { select: { id: true, name: true, busType: true } },
      payment: { select: { status: true, method: true, amount: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Charter Bookings</h1>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center shadow-sm">
          <p className="mb-2 text-4xl">🚌</p>
          <h3 className="font-semibold text-gray-900">No charter bookings yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Enable charter on your buses to start receiving bookings.
          </p>
          <Link href="/operator/buses" className="mt-4 inline-block text-sm font-medium text-blue-600">
            Manage Buses →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                <th className="px-4 py-3">PNR</th>
                <th className="px-4 py-3">Passenger</th>
                <th className="px-4 py-3">Bus</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Deposit</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => {
                const statusInfo = STATUS_BADGE[b.status] ?? { label: b.status, variant: "default" as const };
                return (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {b.pnr.slice(0, 10).toUpperCase()}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{b.user.name ?? "—"}</p>
                      <p className="text-xs text-gray-400">{b.user.phone ?? b.user.email ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{b.bus.name}</p>
                      <p className="text-xs text-gray-400">{BUS_TYPE_LABELS[b.bus.busType]}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {format(new Date(b.startDate), "d MMM")} – {format(new Date(b.endDate), "d MMM yyyy")}
                      <span className="ml-1 text-xs text-gray-400">({b.numDays}d)</span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      ₹{Number(b.depositAmount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      ₹{Number(b.totalAmount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
