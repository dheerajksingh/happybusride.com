import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/operator-login");

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [totalUsers, totalBookings, revenue, activeOps, pendingOps, pendingRefunds, openDisputes] = await Promise.all([
    prisma.user.count({ where: { role: "PASSENGER" } }),
    prisma.booking.count({ where: { status: { in: ["CONFIRMED", "COMPLETED"] } } }),
    prisma.operatorEarning.aggregate({ _sum: { commissionAmt: true } }),
    prisma.operator.count({ where: { status: "APPROVED" } }),
    prisma.operator.count({ where: { status: { in: ["PENDING_KYC", "KYC_SUBMITTED"] } } }),
    prisma.refund.count({ where: { status: "REQUESTED" } }),
    prisma.dispute.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
  ]);

  const stats = [
    { label: "Total Passengers", value: totalUsers.toLocaleString(), icon: "👥", href: "/admin/users" },
    { label: "Total Bookings", value: totalBookings.toLocaleString(), icon: "🎫", href: "/admin/bookings" },
    { label: "Platform Revenue", value: `₹${Number(revenue._sum.commissionAmt ?? 0).toLocaleString()}`, icon: "💰", href: "/admin/analytics" },
    { label: "Active Operators", value: activeOps.toLocaleString(), icon: "🏢", href: "/admin/operators" },
  ];

  const alerts = [
    pendingOps > 0 && { label: `${pendingOps} operator(s) pending approval`, href: "/admin/operators?status=PENDING_KYC", color: "yellow" },
    pendingRefunds > 0 && { label: `${pendingRefunds} refund(s) awaiting review`, href: "/admin/refunds", color: "orange" },
    openDisputes > 0 && { label: `${openDisputes} open dispute(s)`, href: "/admin/disputes", color: "red" },
  ].filter(Boolean) as { label: string; href: string; color: string }[];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Admin Dashboard</h1>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((a) => (
            <Link key={a.href} href={a.href} className={`flex items-center justify-between rounded-lg p-3 text-sm font-medium ${
              a.color === "red" ? "bg-red-900/50 text-red-300 hover:bg-red-900" :
              a.color === "orange" ? "bg-orange-900/50 text-orange-300 hover:bg-orange-900" :
              "bg-yellow-900/50 text-yellow-300 hover:bg-yellow-900"
            }`}>
              <span>⚠️ {a.label}</span>
              <span>→</span>
            </Link>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-xl border border-gray-700 bg-gray-800 p-4 shadow-sm hover:border-blue-500">
            <div className="mb-2 text-2xl">{s.icon}</div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-sm text-gray-400">{s.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
