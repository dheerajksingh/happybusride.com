import { PassengerHeader } from "@/components/layout/PassengerHeader";

export default function PassengerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <PassengerHeader />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
