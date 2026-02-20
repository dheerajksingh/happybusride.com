import { SearchForm } from "@/components/passenger/SearchForm";
import { PassengerHeader } from "@/components/layout/PassengerHeader";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PassengerHeader />
      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-600 to-blue-800 px-4 py-16 text-white">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-4 text-4xl font-bold">Book Bus Tickets Online</h1>
            <p className="mb-10 text-lg text-blue-100">
              Search from 1000+ routes across India. Safe, comfortable, and affordable.
            </p>
            <div className="rounded-2xl bg-white p-6 shadow-xl">
              <SearchForm />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900">Why HappyBusRide?</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "🔒", title: "Secure Booking", desc: "Your data and payments are safe with us" },
              { icon: "💳", title: "Easy Payment", desc: "UPI, Cards, Wallets — all accepted" },
              { icon: "📍", title: "Live Tracking", desc: "Track your bus in real-time" },
              { icon: "💸", title: "Easy Refunds", desc: "Hassle-free cancellation and refunds" },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
                <div className="mb-3 text-4xl">{f.icon}</div>
                <h3 className="mb-1 font-semibold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
