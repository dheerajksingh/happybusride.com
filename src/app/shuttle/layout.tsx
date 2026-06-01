import Link from "next/link";

const NAV = [
  { href: "/shuttle/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/shuttle/vehicles", label: "Vehicles", icon: "🚐" },
  { href: "/shuttle/bookings", label: "Bookings", icon: "📋" },
];

export default function ShuttleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <Link href="/" className="text-base font-black text-teal-600">HappyBusRide</Link>
          <p className="text-xs text-gray-500">Shuttle Operator</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900">
              <span>{item.icon}</span>{item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-200 px-3 py-4">
          <Link href="/shuttle/login"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-red-600">
            <span>🚪</span> Logout
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
