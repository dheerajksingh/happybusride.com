import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";

const statusVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  PENDING: "warning",
  CONFIRMED: "success",
  COMPLETED: "success",
  CANCELLED: "danger",
  REFUNDED: "info",
};

export default async function AdminBookingsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/operator-login");

  const bookings = await prisma.booking.findMany({
    include: {
      user: { select: { name: true, phone: true } },
      trip: {
        include: {
          schedule: {
            include: { route: { include: { fromCity: true, toCity: true } } },
          },
        },
      },
      _count: { select: { seats: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Bookings ({bookings.length})</h1>

      <div className="overflow-x-auto rounded-xl bg-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left text-xs uppercase text-gray-400">
              <th className="px-4 py-3">PNR</th>
              <th className="px-4 py-3">Passenger</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Seats</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3 font-mono text-xs text-gray-300">{b.pnr}</td>
                <td className="px-4 py-3">
                  <p className="text-white">{b.user?.name ?? "—"}</p>
                  <p className="text-xs text-gray-400">{b.user?.phone ?? "—"}</p>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {b.trip?.schedule?.route?.fromCity?.name} → {b.trip?.schedule?.route?.toCity?.name}
                </td>
                <td className="px-4 py-3 text-gray-300 text-xs">
                  {new Date(b.trip?.travelDate ?? b.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3 text-gray-300">{b._count.seats}</td>
                <td className="px-4 py-3 font-medium text-white">₹{Number(b.totalAmount).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[b.status] ?? "default"}>{b.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
