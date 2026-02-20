import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

const statusVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  APPROVED: "success",
  PENDING_KYC: "warning",
  KYC_SUBMITTED: "info",
  REJECTED: "danger",
  SUSPENDED: "danger",
};

export default async function AdminOperatorsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/operator-login");

  const operators = await prisma.operator.findMany({
    include: {
      user: { select: { name: true, email: true, phone: true } },
      _count: { select: { buses: true, routes: true, drivers: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Operators ({operators.length})</h1>

      <div className="overflow-x-auto rounded-xl bg-gray-800 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left text-xs uppercase text-gray-400">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Assets</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {operators.map((op) => (
              <tr key={op.id} className="border-b border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{op.companyName}</p>
                  <p className="text-xs text-gray-400">{op.registrationNo ?? "—"}</p>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  <p>{op.user.name}</p>
                  <p className="text-xs">{op.user.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-300 text-xs">
                  {op._count.buses} buses · {op._count.routes} routes · {op._count.drivers} drivers
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[op.status] ?? "default"}>{op.status.replace("_", " ")}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/operators/${op.id}`} className="text-blue-400 hover:underline text-xs">
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
