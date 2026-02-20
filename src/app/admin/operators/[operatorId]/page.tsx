"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";

export default function OperatorReviewPage({ params }: { params: Promise<{ operatorId: string }> }) {
  const { operatorId } = use(params);
  const router = useRouter();
  const [operator, setOperator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/operators/${operatorId}`);
      if (res.ok) setOperator(await res.json());
      setLoading(false);
    }
    load();
  }, [operatorId]);

  async function handleApprove() {
    setProcessing(true);
    await fetch(`/api/admin/operators/${operatorId}/approve`, { method: "PUT" });
    setProcessing(false);
    router.push("/admin/operators");
  }

  async function handleReject() {
    if (!rejectionReason.trim()) { alert("Provide a reason"); return; }
    setProcessing(true);
    await fetch(`/api/admin/operators/${operatorId}/reject`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectionReason }),
    });
    setProcessing(false);
    setRejectModal(false);
    router.push("/admin/operators");
  }

  if (loading) return <PageSpinner />;
  if (!operator) return <div className="text-white">Operator not found</div>;

  const isPending = ["PENDING_KYC", "KYC_SUBMITTED"].includes(operator.status);

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/admin/operators" className="text-sm text-blue-400 hover:underline">← Operators</Link>
      </div>

      <div className="rounded-xl bg-gray-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">{operator.companyName}</h1>
          <Badge variant={operator.status === "APPROVED" ? "success" : operator.status === "REJECTED" ? "danger" : "warning"}>
            {operator.status}
          </Badge>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          {[
            ["Contact Name", operator.user?.name ?? "—"],
            ["Email", operator.user?.email ?? "—"],
            ["GST", operator.gstNumber ?? "Not provided"],
            ["PAN", operator.panNumber ?? "Not provided"],
            ["Registration No.", operator.registrationNo ?? "Not provided"],
            ["Commission Rate", `${operator.commissionRate}%`],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-gray-400">{label}</p>
              <p className="font-medium text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* KYC Documents */}
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-300">KYC Documents</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["PAN Document", operator.panDocUrl],
              ["GST Document", operator.gstDocUrl],
              ["RC Document", operator.rcDocUrl],
              ["Bank Proof", operator.bankProofUrl],
            ].map(([label, url]) => (
              <div key={label} className="rounded-lg border border-gray-700 p-3">
                <p className="text-xs text-gray-400">{label}</p>
                {url ? (
                  <a href={url} target="_blank" className="text-sm text-blue-400 hover:underline">View Document →</a>
                ) : (
                  <p className="text-xs text-gray-500">Not uploaded</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {isPending && (
          <div className="flex gap-3">
            <Button variant="primary" loading={processing} onClick={handleApprove} className="flex-1">
              Approve Operator
            </Button>
            <Button variant="danger" onClick={() => setRejectModal(true)} className="flex-1">
              Reject
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={rejectModal}
        onClose={() => setRejectModal(false)}
        title="Reject Operator"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectModal(false)}>Cancel</Button>
            <Button variant="danger" loading={processing} onClick={handleReject}>Confirm Reject</Button>
          </>
        }
      >
        <textarea
          className="w-full rounded-lg border border-gray-300 p-3 text-sm"
          rows={4}
          placeholder="Reason for rejection (will be visible to operator)..."
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
        />
      </Modal>
    </div>
  );
}
