"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";

const statusVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  APPROVED: "success",
  PENDING_KYC: "warning",
  KYC_SUBMITTED: "info",
  REJECTED: "danger",
  SUSPENDED: "danger",
  DELETED: "danger",
};

export default function OperatorReviewPage({ params }: { params: Promise<{ operatorId: string }> }) {
  const { operatorId } = use(params);
  const router = useRouter();
  const [operator, setOperator] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ action: string; label: string; variant: "danger" | "warning" } | null>(null);
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

  async function callAction(path: string, body?: object) {
    setProcessing(true);
    await fetch(`/api/admin/operators/${operatorId}/${path}`, {
      method: "PUT",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setProcessing(false);
    router.push("/admin/operators");
  }

  async function handleReject() {
    if (!rejectionReason.trim()) { alert("Provide a reason"); return; }
    await callAction("reject", { reason: rejectionReason });
    setRejectModal(false);
  }

  async function handleConfirmedAction() {
    if (!confirmModal) return;
    await callAction(confirmModal.action);
    setConfirmModal(null);
  }

  if (loading) return <PageSpinner />;
  if (!operator) return <div className="text-white">Operator not found</div>;

  const isPending = ["PENDING_KYC", "KYC_SUBMITTED"].includes(operator.status);
  const isApproved = operator.status === "APPROVED";
  const isSuspendedOrDeleted = ["SUSPENDED", "DELETED"].includes(operator.status);

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center gap-2">
        <Link href="/admin/operators" className="text-sm text-blue-400 hover:underline">← Operators</Link>
      </div>

      <div className="rounded-xl bg-gray-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">{operator.companyName}</h1>
          <Badge variant={statusVariant[operator.status] ?? "default"}>
            {operator.status.replace(/_/g, " ")}
          </Badge>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          {[
            ["Contact Name", operator.user?.name ?? "—"],
            ["Email", operator.user?.email ?? "—"],
            ["Phone", operator.user?.phone ?? "—"],
            ["GST", operator.gstNumber ?? "Not provided"],
            ["PAN", operator.panNumber ?? "Not provided"],
            ["Registration No.", operator.registrationNo ?? "Not provided"],
            ["Bank Name", operator.bankName ?? "Not provided"],
            ["Account No.", operator.bankAccountNo ?? "Not provided"],
            ["IFSC", operator.bankIfsc ?? "Not provided"],
            ["Account Holder", operator.bankAccountName ?? "Not provided"],
            ["Commission Rate", `${operator.commissionRate}%`],
            ["Cancellation Policy", operator.cancellationPolicy ?? "—"],
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

        {/* Rejection reason if present */}
        {operator.rejectionReason && (
          <div className="mb-4 rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-300">
            <span className="font-medium">Rejection reason:</span> {operator.rejectionReason}
          </div>
        )}

        {/* Actions — Pending KYC */}
        {isPending && (
          <div className="flex gap-3">
            <Button variant="primary" loading={processing} onClick={() => callAction("approve")} className="flex-1">
              Approve
            </Button>
            <Button variant="danger" onClick={() => setRejectModal(true)} className="flex-1">
              Reject
            </Button>
          </div>
        )}

        {/* Actions — Approved */}
        {isApproved && (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setConfirmModal({ action: "suspend", label: "Suspend", variant: "warning" })}
              className="flex-1 border-yellow-600 text-yellow-400 hover:bg-yellow-900/30"
            >
              Suspend
            </Button>
            <Button
              variant="danger"
              onClick={() => setConfirmModal({ action: "deactivate", label: "Delete", variant: "danger" })}
              className="flex-1"
            >
              Delete (soft)
            </Button>
          </div>
        )}

        {/* Actions — Suspended / Deleted */}
        {isSuspendedOrDeleted && (
          <div className="flex gap-3">
            <Button variant="primary" loading={processing} onClick={() => callAction("reactivate")} className="flex-1">
              Reactivate Operator
            </Button>
          </div>
        )}
      </div>

      {/* Reject modal */}
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

      {/* Suspend / Delete confirm modal */}
      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={`${confirmModal?.label} Operator?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmModal(null)}>Cancel</Button>
            <Button variant="danger" loading={processing} onClick={handleConfirmedAction}>
              Confirm {confirmModal?.label}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          {confirmModal?.action === "suspend"
            ? "The operator's login will be blocked and their buses will be hidden from passenger search. You can reactivate them later."
            : "The operator account will be soft-deleted. Their login will be blocked and buses hidden from search. You can still reactivate them later."}
        </p>
      </Modal>
    </div>
  );
}
