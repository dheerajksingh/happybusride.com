import { DriverHeader } from "@/components/layout/DriverHeader";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900">
      <DriverHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  );
}
