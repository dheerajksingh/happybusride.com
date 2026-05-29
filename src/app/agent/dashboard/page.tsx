import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

const STATUS_STYLE: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-700",
  APPROVED:  "bg-green-100 text-green-700",
  REJECTED:  "bg-red-100 text-red-600",
  SUSPENDED: "bg-gray-100 text-gray-500",
};

export default async function AgentDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/agent/login");

  const agent = await prisma.agent.findUnique({
    where: { id: session.user.agentId! },
    include: {
      city: { select: { name: true, state: true } },
      _count: { select: { passengerBookings: true, freightBookings: true, freightLegs: true } },
      earnings: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!agent) redirect("/agent/login");

  const totalEarned = await prisma.agentEarning.aggregate({
    where: { agentId: agent.id },
    _sum: { amount: true },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {agent.fullName}</h1>
          <p className="text-sm text-gray-500">{agent.city.name}, {agent.city.state}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${STATUS_STYLE[agent.status]}`}>
          {agent.status}
        </span>
      </div>

      {agent.status === "PENDING" && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          ⏳ Your account is pending admin approval. You can complete your profile while you wait.{" "}
          <Link href="/agent/onboarding" className="font-semibold underline">Complete profile →</Link>
        </div>
      )}

      {agent.status === "REJECTED" && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          ❌ Your application was rejected. Please contact support for more information.
        </div>
      )}

      {/* Stats */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        {[
          { label: "Passenger Bookings", value: agent._count.passengerBookings, color: "text-blue-700", href: "/agent/passengers" },
          { label: "Freight Booked", value: agent._count.freightBookings, color: "text-amber-700", href: "/agent/freight" },
          { label: "Freight Handling", value: agent._count.freightLegs, color: "text-purple-700", href: "/agent/freight" },
          { label: "Total Earned", value: `₹${Number(totalEarned._sum.amount ?? 0).toLocaleString("en-IN")}`, color: "text-green-700", href: "#" },
        ].map(s => (
          <Link key={s.label} href={s.href} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="mt-1 text-xs text-gray-500">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Recent earnings */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4 font-bold text-gray-900">Recent Earnings</div>
        {agent.earnings.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No earnings yet.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50 text-left text-xs uppercase text-gray-400">
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {agent.earnings.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-600">{e.type.replace(/_/g, " ")}</td>
                  <td className="px-5 py-3 font-semibold text-green-700">₹{Number(e.amount).toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3 text-gray-500">{format(new Date(e.date), "d MMM yyyy")}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.settledAt ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {e.settledAt ? "Settled" : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
