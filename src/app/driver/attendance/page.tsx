"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";

export default function DriverAttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [todayStatus, setTodayStatus] = useState<any>(null);

  async function load() {
    const res = await fetch("/api/driver/attendance");
    if (res.ok) {
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
      const today = new Date().toDateString();
      setTodayStatus(data.find((r: any) => new Date(r.date).toDateString() === today));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCheckIn() {
    setCheckingIn(true);
    await fetch("/api/driver/attendance", { method: "POST" });
    setCheckingIn(false);
    load();
  }

  if (loading) return <PageSpinner />;

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-white">Attendance</h1>

      <div className="mb-6 rounded-xl bg-gray-800 p-6 text-center">
        {todayStatus ? (
          <div>
            <p className="text-4xl mb-2">✅</p>
            <p className="text-white font-semibold">Checked in today</p>
            <p className="text-sm text-gray-400">
              {new Date(todayStatus.checkInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-4xl mb-2">🕐</p>
            <p className="text-white font-semibold mb-3">Not checked in yet</p>
            <Button variant="primary" loading={checkingIn} onClick={handleCheckIn}>
              Check In Now
            </Button>
          </div>
        )}
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase text-gray-400">Last 30 Days</h2>
      <div className="grid grid-cols-7 gap-1">
        {records.slice(0, 30).map((r: any) => (
          <div
            key={r.id}
            className={`rounded p-1 text-center ${r.checkedIn ? "bg-green-800 text-green-300" : "bg-gray-800 text-gray-600"}`}
            title={new Date(r.date).toLocaleDateString("en-IN")}
          >
            <p className="text-xs">{new Date(r.date).getDate()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
