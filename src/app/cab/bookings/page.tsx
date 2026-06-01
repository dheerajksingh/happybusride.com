import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

const STATUS_STYLE: Record<string, string> = {
  PENDING:    "bg-yellow-100 text-yellow-700",
  CONFIRMED:  "bg-green-100 text-green-700",
  COMPLETED:  "bg-blue-100 text-blue-700",
  CANCELLED:  "bg-red-100 text-red-600",
};

export default async function CabBookingsPage() {
  const session = await auth();
  if (!session || session.user.role !== "CAB_OPERATOR") redirect("/cab/login");

  const operator = await prisma.cabOperator.findUnique({
    where: { userId: session.user.id },
  });
  if (!operator) redirect("/cab/login");

  const bookings = await prisma.cabBooking.findMany({
    where: { cabOperatorId: operator.id },
    include: {
      booking: {
        include: {
          user: { select: { name: true, phone: true } },
        },
      },
      city: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Cab Bookings ({bookings.length})</h1>

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-4xl mb-2">🚕</p>
          <p className="text-gray-500">No bookings yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
                <th className="px-4 py-3">Passenger</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b: any) => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{b.booking?.user?.name ?? "—"}</div>
                    <div className="text-xs text-gray-400">{b.booking?.user?.phone ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.type}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{b.address}</td>
                  <td className="px-4 py-3 text-gray-600">{b.city?.name}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">₹{Number(b.price).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(b.createdAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
