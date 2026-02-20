"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";

export default function AdminRefundsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  async function load(status = "REQUESTED") {
    const res = await fetch(`/api/admin/refunds?status=${status}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function approve(refundId: string) {
    setProcessing(true);
    await fetch(`/api/admin/refunds/${refundId}/approve`, { method: "PUT" });
    setProcessing(false);
    load();
  }

  async function reject() {
    if (!rejectModal) return;
    setProcessing(true);
    await fetch(`/api/admin/refunds/${rejectModal}/reject`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    setProcessing(false);
    setRejectModal(null);
    setRejectReason("");
    load();
  }

  if (loading) return <PageSpinner />;

  const refunds = data?.refunds ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Refund Queue ({refunds.length})</h1>

      <div className="overflow-x-auto rounded-xl bg-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left text-xs uppercase text-gray-400">
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Passenger</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {refunds.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-gray-500">No pending refunds</td></tr>
            )}
            {refunds.map((r: any) => (
              <tr key={r.id} className="border-b border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3 font-mono text-xs text-gray-300">{r.booking?.pnr}</td>
                <td className="px-4 py-3">
                  <p className="text-white">{r.booking?.user?.name}</p>
                  <p className="text-xs text-gray-400">{r.booking?.user?.phone}</p>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {r.booking?.trip?.schedule?.route?.fromCity?.name} → {r.booking?.trip?.schedule?.route?.toCity?.name}
                </td>
                <td className="px-4 py-3 font-semibold text-white">₹{Number(r.amount).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 max-w-xs truncate text-gray-400 text-xs">{r.reason ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      loading={processing}
                      onClick={() => approve(r.id)}
                      className="text-xs py-1 px-2"
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setRejectModal(r.id)}
                      className="text-xs py-1 px-2"
                    >
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!rejectModal}
        onClose={() => setRejectModal(null)}
        title="Reject Refund"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectModal(null)}>Cancel</Button>
            <Button variant="danger" loading={processing} onClick={reject}>Confirm Reject</Button>
          </>
        }
      >
        <textarea
          className="w-full rounded-lg border border-gray-300 p-3 text-sm"
          rows={3}
          placeholder="Reason for rejection (optional)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
