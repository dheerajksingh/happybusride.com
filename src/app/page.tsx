"use client";

import { useState } from "react";
import Link from "next/link";
import { SearchForm } from "@/components/passenger/SearchForm";
import { PassengerHeader } from "@/components/layout/PassengerHeader";

type Service = "tickets" | "charter" | "corporate";

const SERVICES: { id: Service; label: string; icon: string; tagline: string; description: string }[] = [
  {
    id: "tickets",
    label: "Bus Tickets",
    icon: "🎫",
    tagline: "City to city, on your schedule",
    description: "Search and book seats on scheduled buses across 1000+ routes in India. Pick your seat, travel safe.",
  },
  {
    id: "charter",
    label: "Charter Bus",
    icon: "🚌",
    tagline: "The whole bus, your rules",
    description: "Book an entire bus for weddings, pilgrimages, school trips, or group travel. Set your own dates, route, and pickup points.",
  },
  {
    id: "corporate",
    label: "Corporate Charter",
    icon: "🏢",
    tagline: "Managed mobility for teams",
    description: "Dedicated bus fleets for employee commute, offsite travel, and recurring corporate routes — with billing, reporting and SLA guarantees.",
  },
];

const HERO_GRADIENT: Record<Service, string> = {
  tickets: "from-blue-600 to-blue-800",
  charter: "from-amber-500 to-orange-600",
  corporate: "from-violet-600 to-purple-800",
};

const TAB_ACTIVE: Record<Service, string> = {
  tickets: "bg-blue-600 text-white shadow",
  charter: "bg-amber-500 text-white shadow",
  corporate: "bg-violet-600 text-white shadow",
};

const FEATURES: Record<Service, { icon: string; title: string; desc: string }[]> = {
  tickets: [
    { icon: "💺", title: "Choose Your Seat", desc: "Pick any available seat from the live seat map" },
    { icon: "📍", title: "Live Tracking", desc: "Follow your bus in real-time on the day of travel" },
    { icon: "💸", title: "Easy Cancellation", desc: "Cancel anytime and get a refund per the operator policy" },
    { icon: "💳", title: "All Payments", desc: "UPI, cards, wallets — pay the way you like" },
  ],
  charter: [
    { icon: "🗺️", title: "Draw Your Route", desc: "Plot waypoints on the map — go anywhere, any order" },
    { icon: "📅", title: "Multi-Day Trips", desc: "Book for one day or an entire week" },
    { icon: "💰", title: "Pay a Deposit", desc: "Confirm with just a % deposit, pay balance later" },
    { icon: "🚐", title: "All Bus Types", desc: "AC, Non-AC, Sleeper, Luxury — your choice" },
  ],
  corporate: [
    { icon: "🔄", title: "Recurring Schedules", desc: "Set up daily/weekly employee commute routes" },
    { icon: "📊", title: "Usage Reports", desc: "Per-trip billing and detailed travel analytics" },
    { icon: "🤝", title: "Dedicated Account", desc: "A single point of contact for all your fleet needs" },
    { icon: "🔒", title: "SLA Guarantee", desc: "Punctuality and safety commitments in writing" },
  ],
};

export default function LandingPage() {
  const [active, setActive] = useState<Service>("tickets");
  const svc = SERVICES.find((s) => s.id === active)!;

  return (
    <div className="min-h-screen bg-gray-50">
      <PassengerHeader activeService={active} />

      {/* Hero */}
      <section className={`bg-gradient-to-br ${HERO_GRADIENT[active]} px-4 pb-16 pt-12 text-white transition-all duration-300`}>
        <div className="mx-auto max-w-4xl">
          {/* Service tabs */}
          <div className="mb-10 flex justify-center">
            <div className="flex gap-1 rounded-2xl bg-white/20 p-1.5 backdrop-blur-sm">
              {SERVICES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                    active === s.id ? TAB_ACTIVE[s.id] : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hero text */}
          <div className="mb-8 text-center">
            <h1 className="mb-3 text-4xl font-bold">{svc.tagline}</h1>
            <p className="mx-auto max-w-xl text-lg text-white/80">{svc.description}</p>
          </div>

          {/* Service-specific panel */}
          <div className="rounded-2xl bg-white p-6 shadow-2xl">
            {active === "tickets" && <SearchForm />}
            {active === "charter" && <CharterPanel />}
            {active === "corporate" && <CorporatePanel />}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
          Why choose {svc.label}?
        </h2>
        <p className="mb-10 text-center text-sm text-gray-500">{svc.tagline}</p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES[active].map((f) => (
            <div key={f.title} className="rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
              <div className="mb-3 text-4xl">{f.icon}</div>
              <h3 className="mb-1 font-semibold text-gray-900">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Other services callout */}
      <section className="border-t border-gray-200 bg-white px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-center text-xl font-bold text-gray-900">All our services</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                onClick={() => { setActive(s.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={`rounded-xl border-2 p-5 text-left transition-all ${
                  active === s.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <div className="mb-2 text-3xl">{s.icon}</div>
                <h3 className="mb-1 font-semibold text-gray-900">{s.label}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{s.description}</p>
                {s.id === "corporate" && (
                  <span className="mt-2 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                    Coming Soon
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function CharterPanel() {
  return (
    <div className="space-y-4 text-center">
      <div>
        <p className="text-2xl font-bold text-gray-900">Book a full bus for your group</p>
        <p className="mt-1 text-sm text-gray-500">
          Set dates, plan your route on an interactive map, and pay just a deposit to confirm.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/charter"
          className="inline-block rounded-xl bg-amber-500 px-8 py-3 text-base font-semibold text-white hover:bg-amber-600"
        >
          Browse Charter Buses
        </Link>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 rounded-xl border border-gray-100 bg-gray-50 py-3 text-center text-sm">
        <div>
          <p className="font-bold text-gray-900">Multi-day</p>
          <p className="text-xs text-gray-500">trips supported</p>
        </div>
        <div>
          <p className="font-bold text-gray-900">Map routing</p>
          <p className="text-xs text-gray-500">plan any route</p>
        </div>
        <div>
          <p className="font-bold text-gray-900">Deposit only</p>
          <p className="text-xs text-gray-500">pay balance later</p>
        </div>
      </div>
    </div>
  );
}

function CorporatePanel() {
  return (
    <div className="space-y-4 text-center">
      <div>
        <span className="inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 mb-3">
          Coming Soon
        </span>
        <p className="text-2xl font-bold text-gray-900">Corporate travel, simplified</p>
        <p className="mt-1 text-sm text-gray-500">
          Managed bus fleets for employee commutes, offsites, and recurring corporate routes — with SLA, billing, and reporting built in.
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-left space-y-2">
        <p className="text-sm font-semibold text-gray-700">Leave your details and we'll reach out</p>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="Work email"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
          />
          <button
            type="button"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Notify Me
          </button>
        </div>
      </div>
    </div>
  );
}
