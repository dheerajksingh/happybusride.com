"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { useMapData } from "@/components/corporate/useMapData";
import EmployeeManager from "@/components/corporate/EmployeeManager";

const CorporateMap = dynamic(() => import("@/components/corporate/CorporateMap"), { ssr: false });
const SingleBusMap = dynamic(() => import("@/components/corporate/SingleBusMap"), { ssr: false });

interface Bid {
  id: string;
  status: string;
  quoteAmount: string | null;
  quoteNote: string | null;
  quotedAt: string | null;
  operator: {
    id: string;
    companyName: string;
    user: { email: string; phone: string | null };
    buses?: { id: string; name: string; busType: string; totalSeats: number }[];
  };
}

interface Message {
  id: string;
  message: string;
  senderRole: string;
  createdAt: string;
  sender: { name: string | null; role: string };
}

interface Request {
  id: string;
  city: string;
  state: string;
  status: string;
  officeAddress: string;
  officeLat?: number | string | null;
  officeLng?: number | string | null;
  arrivalTime: string;
  departureTime: string;
  startDate: string;
  maxTravelMins: number | null;
  notes: string | null;
  suggestedPrice: string | null;
  bids: Bid[];
  messages: Message[];
  employees: { id: string; name: string; address: string }[];
  _count?: { employees: number };
}

const BID_STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
  WITHDRAWN: "bg-gray-100 text-gray-500",
};

export default function CorporateRequestPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"bids" | "chat" | "employees" | "map">("bids");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const mapLoaded = useRef(false);
  const { status: mapStatus, office, employees: mapEmployees, skipped, load: loadMap } = useMapData();
  const [generatingRoute, setGeneratingRoute] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [mapRoutes, setMapRoutes] = useState<import("@/components/corporate/CorporateMap").MapRoute[]>([]);

  async function load() {
    const res = await fetch(`/api/corporate/requests/${id}`);
    if (res.ok) {
      const data = await res.json();
      setRequest(data.request);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function generateRoute() {
    if (!request || !office) return;
    setGeneratingRoute(true);
    setRouteError("");

    // Always pass the already-geocoded office coords directly in the body
    // so the server never has to re-geocode (and can never fail doing so)
    const res = await fetch(`/api/corporate/requests/${request.id}/routes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ officeLat: office.lat, officeLng: office.lng }),
    });
    const data = await res.json();
    setGeneratingRoute(false);
    if (!res.ok) { setRouteError(data.error ?? "Route generation failed"); return; }
    setMapRoutes(
      data.routeDetails.map((rd: any) => ({
        polyline: rd.polyline,
        stops: data.routes.find((r: any) => r.id === rd.routeId)?.stops.map((s: any) => ({
          stopOrder: s.stopOrder,
          address: s.address,
          lat: Number(s.latitude),
          lng: Number(s.longitude),
          employeeCount: s.employeeCount,
          pickupTime: s.pickupTime,
        })) ?? [],
        distanceKm: rd.distanceKm,
        durationMins: rd.durationMins,
        color: rd.color,
        isFallback: rd.isFallback,
      }))
    );
  }

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [request?.messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);
    await fetch(`/api/corporate/requests/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: newMessage.trim() }),
    });
    setNewMessage("");
    await load();
    setSending(false);
  }

  async function acceptBid(bidId: string) {
    setAccepting(bidId);
    await fetch(`/api/corporate/requests/${id}/bids`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bidId }),
    });
    await load();
    setAccepting(null);
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center text-gray-400">Loading…</div>;
  if (!request) return <div className="p-8 text-center text-gray-500">Request not found.</div>;

  const STATUS_STYLE: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    SUBMITTED: "bg-blue-100 text-blue-700",
    QUOTED: "bg-yellow-100 text-yellow-700",
    ACCEPTED: "bg-green-100 text-green-700",
    ACTIVE: "bg-emerald-100 text-emerald-700",
    COMPLETED: "bg-gray-200 text-gray-500",
    CANCELLED: "bg-red-100 text-red-600",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link href="/" className="text-xs font-black text-violet-700 hover:opacity-80 mr-1">HappyBusRide</Link>
          <span className="text-gray-300">/</span>
          <Link href="/corporate/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">Dashboard</Link>
          <span className="text-gray-300">/</span>
          <div>
            <span className="font-bold text-gray-900">{request.city}, {request.state}</span>
            <span className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[request.status]}`}>
              {request.status.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-6 grid grid-cols-3 gap-6">
        {/* Left: request details */}
        <div className="col-span-1 space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-sm space-y-2">
            <h3 className="font-bold text-gray-900 mb-3">Request Details</h3>
            <div><span className="text-gray-400">Office</span><p className="font-medium text-gray-800 mt-0.5">{request.officeAddress}</p></div>
            <div className="flex justify-between"><span className="text-gray-400">Arrival</span><span className="font-medium">{request.arrivalTime}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Departure</span><span className="font-medium">{request.departureTime}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Start Date</span><span className="font-medium">{format(new Date(request.startDate), "d MMM yyyy")}</span></div>
            {request.maxTravelMins && <div className="flex justify-between"><span className="text-gray-400">Max travel</span><span className="font-medium">{request.maxTravelMins} min</span></div>}
            {request.suggestedPrice && (
              <div className="mt-2 rounded-lg bg-violet-50 p-3">
                <div className="text-xs text-violet-500">Suggested rate</div>
                <div className="font-bold text-violet-700">₹{Number(request.suggestedPrice).toFixed(2)}/km</div>
              </div>
            )}
            {request.notes && <div><span className="text-gray-400">Notes</span><p className="mt-0.5 text-gray-600">{request.notes}</p></div>}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-900">Employees</h3>
              <span className="text-gray-400">{request.employees.length}</span>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {request.employees.slice(0, 8).map((e) => (
                <div key={e.id} className="text-gray-600">
                  <span className="font-medium">{e.name}</span> — <span className="text-xs text-gray-400">{e.address}</span>
                </div>
              ))}
              {request.employees.length > 8 && <p className="text-xs text-gray-400">+{request.employees.length - 8} more</p>}
            </div>
          </div>
        </div>

        {/* Right: tabs */}
        <div className="col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {[
              ["bids", `Quotes (${request.bids.length})`],
              ["map", `🗺️ Route Map`],
              ["chat", `Messages (${request.messages.length})`],
              ["employees", "Employees"],
            ].map(([t, label]) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t as any);
                  if (t === "map" && !mapLoaded.current && request.employees.length > 0) {
                    mapLoaded.current = true;
                    loadMap(request);
                  }
                }}
                className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${tab === t ? "border-b-2 border-violet-600 text-violet-700" : "text-gray-500 hover:text-gray-800"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "bids" && (
            <div className="p-4 space-y-3">
              {request.bids.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <div className="text-3xl mb-2">⏳</div>
                  <p className="font-medium text-gray-600">Waiting for operator quotes</p>
                  <p className="text-sm mt-1">Operators in {request.city} will respond within 24–48 hours.</p>
                </div>
              ) : (
                request.bids.map((bid) => (
                  <div key={bid.id} className="rounded-lg border border-gray-200 p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-900">{bid.operator.companyName}</p>
                        <p className="text-xs text-gray-400">{bid.operator.user.email} · {bid.operator.user.phone ?? "—"}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BID_STATUS_STYLE[bid.status]}`}>
                        {bid.status}
                      </span>
                    </div>

                    {bid.quoteAmount && (
                      <div className="text-xl font-black text-violet-700">
                        ₹{Number(bid.quoteAmount).toLocaleString()}
                        <span className="ml-1 text-sm font-normal text-gray-400">/month</span>
                      </div>
                    )}

                    {bid.quoteNote && <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">{bid.quoteNote}</p>}

                    {bid.operator.buses && bid.operator.buses.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {bid.operator.buses.map((b) => (
                          <span key={b.id} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                            {b.name} · {b.totalSeats} seats
                          </span>
                        ))}
                      </div>
                    )}

                    {bid.status === "PENDING" && request.status !== "ACCEPTED" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => acceptBid(bid.id)}
                          disabled={accepting === bid.id}
                          className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {accepting === bid.id ? "Accepting…" : "Accept Quote"}
                        </button>
                        <button
                          onClick={() => setTab("chat")}
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Chat with Operator
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "chat" && (
            <div className="flex flex-col h-96">
              <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {request.messages.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 mt-8">No messages yet. Start a conversation with the operator.</p>
                ) : (
                  request.messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderRole === "CORPORATE" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-xs rounded-xl px-3 py-2 text-sm ${msg.senderRole === "CORPORATE" ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-800"}`}>
                        <p className={`text-xs mb-1 ${msg.senderRole === "CORPORATE" ? "text-violet-200" : "text-gray-400"}`}>{msg.sender.name}</p>
                        <p>{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.senderRole === "CORPORATE" ? "text-violet-200" : "text-gray-400"}`}>
                          {format(new Date(msg.createdAt), "d MMM · HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={sendMessage} className="border-t border-gray-100 p-3 flex gap-2">
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message…"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
                />
                <button type="submit" disabled={!newMessage.trim() || sending} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
                  Send
                </button>
              </form>
            </div>
          )}

          {tab === "employees" && (
            <div className="p-4">
              <EmployeeManager
                requestId={request.id}
                initial={request.employees}
                onChange={load}
              />
            </div>
          )}

          {tab === "map" && (
            <div className="p-4">
              {request.employees.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <div className="text-3xl mb-2">🗺️</div>
                  <p className="font-medium text-gray-600">No employees added yet</p>
                  <p className="text-sm mt-1">Add employees first to see the route map.</p>
                </div>
              ) : mapStatus === "idle" ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-gray-500 mb-3">
                    Shows employee locations clustered into pickup stops, with suggested routes to the office.
                  </p>
                  <button
                    onClick={() => { mapLoaded.current = true; loadMap(request); }}
                    className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                  >
                    Load Route Map
                  </button>
                </div>
              ) : mapStatus === "loading" ? (
                <div className="py-10 text-center text-gray-400">
                  <div className="animate-spin text-3xl mb-3">⏳</div>
                  <p className="text-sm">Geocoding addresses… this may take a moment.</p>
                </div>
              ) : mapStatus === "error" ? (
                <div className="py-8 text-center text-red-500">
                  <p>Could not geocode the office address. Check the address and try again.</p>
                </div>
              ) : office ? (
                <div>
                  {/* Toolbar */}
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    {mapRoutes.length > 0 ? (
                      <>
                        <span className="text-sm font-semibold text-gray-700">
                          🚌 {mapRoutes.length} bus{mapRoutes.length > 1 ? "es" : ""} ·{" "}
                          ⏱ max {Math.max(...mapRoutes.map(r => r.durationMins))} min ·{" "}
                          👤 {mapEmployees.length} employees
                        </span>
                        {mapRoutes.some(r => r.isFallback) && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                            ⚠️ Estimated (enable Routes API for road-accurate)
                          </span>
                        )}
                        <button onClick={() => setMapRoutes([])} className="ml-auto text-xs text-gray-400 hover:text-gray-700">
                          ✕ Clear routes
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-gray-500">
                          🏢 Office &nbsp;·&nbsp; 👤 Employees &nbsp;·&nbsp; 🚌 Pickup clusters
                          {skipped > 0 && <span className="ml-2 text-amber-600">({skipped} not geocoded)</span>}
                        </span>
                        <button
                          onClick={generateRoute}
                          disabled={generatingRoute || mapEmployees.length === 0}
                          className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {generatingRoute
                            ? <><span className="animate-spin inline-block">⏳</span> Computing…</>
                            : <>🗺️ Generate Optimal Routes</>}
                        </button>
                      </>
                    )}
                  </div>

                  {routeError && (
                    <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{routeError}</div>
                  )}

                  {/* Cluster overview map (always shown, used to view employee positions) */}
                  {mapRoutes.length === 0 && (
                    <>
                      <CorporateMap
                        key="cluster"
                        office={office}
                        employees={mapEmployees}
                        height="380px"
                        requestId={request.id}
                      />
                      <p className="mt-2 text-xs text-gray-400">
                        {mapEmployees.length} employees · max {request.maxTravelMins ?? 60} min travel · click "Generate Optimal Routes" to create bus routes
                      </p>
                    </>
                  )}

                  {/* Stacked per-bus maps */}
                  {mapRoutes.length > 0 && (
                    <div className="space-y-4">
                      {mapRoutes.map((route, idx) => (
                        <div key={idx} className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                          {/* Bus header */}
                          <div
                            className="flex items-center gap-3 px-4 py-2.5 text-white text-sm font-semibold"
                            style={{ background: route.color ?? "#2563eb" }}
                          >
                            <span>🚌 {mapRoutes.length > 1 ? `Bus ${idx + 1}` : "Route"}</span>
                            <span className="opacity-80 text-xs font-normal ml-2">
                              {route.stops.filter(s => s.employeeCount > 0).length} stops ·{" "}
                              {route.employees?.length ?? 0} employees ·{" "}
                              {route.distanceKm} km · {route.durationMins} min
                            </span>
                          </div>

                          {/* Map */}
                          <SingleBusMap
                            key={`bus-map-${idx}`}
                            route={route}
                            officeAddress={request.officeAddress}
                            officeLat={office.lat}
                            officeLng={office.lng}
                            employees={route.employees ?? []}
                            height="280px"
                          />

                          {/* Stop list */}
                          <div className="divide-y divide-gray-50">
                            {route.stops.map((s) => (
                              <div key={s.stopOrder} className="flex items-center gap-3 px-4 py-2 text-sm bg-white">
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                  style={{ background: s.employeeCount === 0 ? "#7c3aed" : (route.color ?? "#2563eb") }}
                                >
                                  {s.employeeCount === 0 ? "🏢" : s.stopOrder}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 truncate">
                                    {s.employeeCount === 0
                                      ? "Office (destination)"
                                      : `Stop ${s.stopOrder} — ${s.employeeCount} employee${s.employeeCount !== 1 ? "s" : ""}`}
                                  </p>
                                  {s.employeeCount > 0 && (
                                    <p className="text-xs text-gray-400 truncate">{s.address}</p>
                                  )}
                                </div>
                                {s.pickupTime && (
                                  <span className="text-xs text-gray-400 flex-shrink-0">arrive {s.pickupTime}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
