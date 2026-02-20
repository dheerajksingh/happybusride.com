"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";

const statusVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  SCHEDULED: "default",
  BOARDING: "info",
  IN_PROGRESS: "success",
  COMPLETED: "success",
  CANCELLED: "danger",
  DELAYED: "warning",
};

export default function TripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState<{ tripId: string } | null>(null);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/operator/trips").then((r) => r.json()),
      fetch("/api/operator/drivers").then((r) => r.json()),
    ]).then(([t, d]) => {
      setTrips(Array.isArray(t) ? t : []);
      setDrivers(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  async function handleAssign() {
    if (!assignModal || !selectedDriver) return;
    setAssigning(true);
    await fetch(`/api/operator/trips/${assignModal.tripId}/driver`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId: selectedDriver }),
    });
    setAssigning(false);
    setAssignModal(null);
    // Refresh
    fetch("/api/operator/trips").then((r) => r.json()).then((t) => setTrips(Array.isArray(t) ? t : []));
  }

  if (loading) return <PageSpinner />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Trips</h1>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Bus</th>
              <th className="px-4 py-3">Driver</th>
              <th className="px-4 py-3">Bookings</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {trips.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">No trips found</td></tr>
            )}
            {trips.map((trip) => (
              <tr key={trip.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {new Date(trip.travelDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {trip.schedule?.route?.fromCity?.name} → {trip.schedule?.route?.toCity?.name}
                </td>
                <td className="px-4 py-3 text-gray-600">{trip.schedule?.bus?.name}</td>
                <td className="px-4 py-3 text-gray-600">
                  {trip.driver?.user?.name ?? <span className="text-orange-500 text-xs">Unassigned</span>}
                </td>
                <td className="px-4 py-3 text-gray-600">{trip._count?.bookings}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant[trip.status] ?? "default"}>
                    {trip.status.replace("_", " ")}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => { setAssignModal({ tripId: trip.id }); setSelectedDriver(trip.driverId ?? ""); }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {trip.driver ? "Reassign" : "Assign Driver"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!assignModal}
        onClose={() => setAssignModal(null)}
        title="Assign Driver"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignModal(null)}>Cancel</Button>
            <Button variant="primary" loading={assigning} onClick={handleAssign}>Assign</Button>
          </>
        }
      >
        <select
          className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
          value={selectedDriver}
          onChange={(e) => setSelectedDriver(e.target.value)}
        >
          <option value="">Select driver</option>
          {drivers.map((d: any) => (
            <option key={d.id} value={d.id}>
              {d.user?.name} ({d.licenseNumber})
            </option>
          ))}
        </select>
      </Modal>
    </div>
  );
}
