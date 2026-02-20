"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveModal, setResolveModal] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const [processing, setProcessing] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/disputes?status=OPEN");
    if (res.ok) setDisputes(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function resolve() {
    if (!resolveModal || !resolution.trim()) { alert("Provide a resolution"); return; }
    setProcessing(true);
    await fetch(`/api/admin/disputes/${resolveModal}/resolve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution }),
    });
    setProcessing(false);
    setResolveModal(null);
    setResolution("");
    load();
  }

  if (loading) return <PageSpinner />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">Disputes ({disputes.length})</h1>

      <div className="space-y-3">
        {disputes.length === 0 && (
          <div className="rounded-xl bg-gray-800 p-12 text-center text-gray-500">
            No open disputes. All clear!
          </div>
        )}
        {disputes.map((d: any) => (
          <div key={d.id} className="rounded-xl bg-gray-800 p-4">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="font-semibold text-white">{d.subject}</p>
                <p className="text-sm text-gray-400">
                  {d.user?.name} · {d.booking?.trip?.schedule?.route?.fromCity?.name} → {d.booking?.trip?.schedule?.route?.toCity?.name}
                </p>
              </div>
              <Badge variant="warning">{d.status}</Badge>
            </div>
            <p className="mb-3 text-sm text-gray-300">{d.description}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {new Date(d.createdAt).toLocaleDateString("en-IN")}
              </p>
              <Button
                variant="primary"
                onClick={() => setResolveModal(d.id)}
                className="text-xs py-1 px-3"
              >
                Resolve
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!resolveModal}
        onClose={() => setResolveModal(null)}
        title="Resolve Dispute"
        footer={
          <>
            <Button variant="secondary" onClick={() => setResolveModal(null)}>Cancel</Button>
            <Button variant="primary" loading={processing} onClick={resolve}>Mark Resolved</Button>
          </>
        }
      >
        <textarea
          className="w-full rounded-lg border border-gray-300 p-3 text-sm"
          rows={4}
          placeholder="Describe the resolution taken..."
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
        />
      </Modal>
    </div>
  );
}
