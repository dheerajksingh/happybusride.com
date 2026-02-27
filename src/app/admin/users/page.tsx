"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";

interface AdminUser {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  walletBalance: string;
  createdAt: string;
  _count: { bookings: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        setUsers(d);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        u.email?.toLowerCase().includes(q)
    );
  }, [users, search]);

  async function toggleStatus(userId: string, currentlyActive: boolean) {
    setToggling(userId);
    const res = await fetch(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentlyActive }),
    });
    setToggling(null);
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isActive: !currentlyActive } : u))
      );
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          Passengers ({filtered.length}{search ? ` of ${users.length}` : ""})
        </h1>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, email…"
          className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : (
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
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No users match your search.
                  </td>
                </tr>
              )}
              {filtered.map((u) => (
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
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStatus(u.id, u.isActive)}
                      disabled={toggling === u.id}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                        u.isActive
                          ? "border border-red-600 text-red-400 hover:bg-red-900/30"
                          : "border border-green-600 text-green-400 hover:bg-green-900/30"
                      }`}
                    >
                      {toggling === u.id ? "…" : u.isActive ? "Suspend" : "Activate"}
                    </button>
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
