"use client";
import { useEffect, useState } from "react";
import { format } from "date-fns";

export default function OperatorMessagesPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [msgText, setMsgText] = useState("");
  const [sending, setSending] = useState(false);

  async function loadMessages() {
    const res = await fetch("/api/operator/messages");
    const d = await res.json();
    setMessages(d.messages ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadMessages();
    fetch("/api/operator/agents/route-cities")
      .then(r => r.json())
      .then(d => setAgents(d.agents ?? []));
  }, []);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAgent || !msgText.trim()) return;
    setSending(true);
    await fetch("/api/operator/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId: selectedAgent, message: msgText }),
    });
    setMsgText("");
    setSending(false);
    await loadMessages();
  }

  if (loading) return <div className="py-12 text-center text-gray-400">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agent Messages</h1>
        <p className="text-sm text-gray-500">Communicate with agents about freight, arrivals, and confirmations</p>
      </div>

      {/* Freight approval context note */}
      {messages.filter(m => m.fromAgent && !m.isReadByOperator).length > 0 && (
        <div className="mb-4 rounded-lg bg-orange-50 border border-orange-200 px-4 py-2 text-sm text-orange-800">
          {messages.filter(m => m.fromAgent && !m.isReadByOperator).length} unread message(s) from agents
        </div>
      )}

      {/* Send message */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-gray-900 text-sm">Reply / New Message</h2>
        <form onSubmit={sendMessage} className="space-y-3">
          <select
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
            value={selectedAgent}
            onChange={e => setSelectedAgent(e.target.value)}
            required
          >
            <option value="">Select agent</option>
            {agents.map((a: any) => (
              <option key={a.id} value={a.id}>{a.fullName} — {a.cityName}</option>
            ))}
          </select>
          <textarea
            className="w-full rounded-lg border border-gray-300 p-2.5 text-sm"
            rows={3}
            placeholder="Approve freight, update ETA, or send any message…"
            value={msgText}
            onChange={e => setMsgText(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send Message"}
          </button>
        </form>
      </div>

      {/* Thread */}
      {messages.length === 0 ? (
        <div className="rounded-xl bg-white border border-gray-200 p-10 text-center">
          <div className="text-3xl mb-2">💬</div>
          <h3 className="font-semibold text-gray-900">No messages yet</h3>
          <p className="text-sm text-gray-500 mt-1">Agent notifications will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m: any) => (
            <div
              key={m.id}
              className={`rounded-xl p-4 text-sm ${!m.fromAgent ? "bg-blue-50 border border-blue-100 ml-8" : "bg-white border border-gray-200"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-800">
                  {m.fromAgent ? `${m.agent?.fullName} (${m.agent?.city?.name})` : "You"}
                </span>
                <span className="text-xs text-gray-400">{format(new Date(m.createdAt), "d MMM, h:mm a")}</span>
              </div>
              {m.freightBookingId && (
                <div className="mb-1 text-xs text-blue-600">Re: freight booking</div>
              )}
              <p className="text-gray-700">{m.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
