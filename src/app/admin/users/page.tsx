import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/operator-login");

  const users = await prisma.user.findMany({
    where: { role: "PASSENGER" },
    include: { _count: { select: { bookings: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Passengers ({users.length})</h1>

      <div className="overflow-x-auto rounded-xl bg-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left text-xs uppercase text-gray-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Bookings</th>
              <th className="px-4 py-3">Wallet</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3 font-medium text-white">{u.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-300">{u.phone ?? "—"}</td>
                <td className="px-4 py-3 text-gray-300">{u.email ?? "—"}</td>
                <td className="px-4 py-3 text-gray-300">{u._count.bookings}</td>
                <td className="px-4 py-3 text-gray-300">₹{Number(u.walletBalance).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.isActive ? "success" : "danger"}>
                    {u.isActive ? "Active" : "Suspended"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(u.createdAt).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
