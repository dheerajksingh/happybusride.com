"use client";

import { useState, useRef } from "react";

const MAX_EMPLOYEES = 100;

export interface Employee {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface ParsedRow {
  name: string;
  address: string;
  phone: string;
}

interface ValidatedRow extends ParsedRow {
  lat: number;
  lng: number;
}

interface InvalidRow extends ParsedRow {
  reason: string;
}

interface Props {
  requestId: string;
  initial: Employee[];
  onChange?: () => void;
}

// ── CSV helpers ───────────────────────────────────────────────

function parseCsvRow(row: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cols.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cols.push(current.trim());
  return cols;
}

function escapeCsv(val: string) {
  if (/[",\n]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
  return val;
}

// ── geocode single address via our backend ────────────────────

async function geocodeSingle(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch("/api/corporate/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresses: [address] }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.results?.[0] ?? null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────

export default function EmployeeManager({ requestId, initial, onChange }: Props) {
  const [employees, setEmployees] = useState<Employee[]>(initial);
  const [editing, setEditing] = useState<Record<string, Employee>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // add-row state
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState({ name: "", address: "", phone: "" });
  const [addGeoState, setAddGeoState] = useState<"idle" | "checking" | "ok" | "warn">("idle");
  const [addSaving, setAddSaving] = useState(false);

  // upload / validation state
  type UploadPhase = "idle" | "geocoding" | "review";
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [geocodingProgress, setGeocodingProgress] = useState({ done: 0, total: 0 });
  const [validRows, setValidRows] = useState<ValidatedRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<InvalidRow[]>([]);
  const [uploading, setUploading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // ── inline edit ─────────────────────────────────────────────

  function startEdit(emp: Employee) {
    setEditing((prev) => ({ ...prev, [emp.id]: { ...emp } }));
  }
  function cancelEdit(id: string) {
    setEditing((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }
  async function saveEdit(id: string) {
    const draft = editing[id];
    if (!draft) return;
    setSaving(id);
    const res = await fetch(`/api/corporate/requests/${requestId}/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: draft.name, address: draft.address, phone: draft.phone || undefined }),
    });
    setSaving(null);
    if (!res.ok) return;
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...draft } : e)));
    cancelEdit(id);
    onChange?.();
  }

  // ── delete ──────────────────────────────────────────────────

  async function deleteEmployee(id: string) {
    if (!window.confirm("Remove this employee?")) return;
    setDeleting(id);
    await fetch(`/api/corporate/requests/${requestId}/employees/${id}`, { method: "DELETE" });
    setDeleting(null);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    onChange?.();
  }

  // ── add single row (with geocode validation) ────────────────

  async function handleAddSave() {
    if (!newRow.name || !newRow.address) return;
    if (employees.length >= MAX_EMPLOYEES) {
      setAddGeoState("idle");
      setAdding(false);
      return;
    }
    setAddSaving(true);
    setAddGeoState("checking");

    const coords = await geocodeSingle(`${newRow.address}, India`);
    if (!coords) {
      setAddGeoState("warn");
      setAddSaving(false);
      return; // user must confirm or cancel
    }

    setAddGeoState("ok");
    const res = await fetch(`/api/corporate/requests/${requestId}/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employees: [{ ...newRow, latitude: coords.lat, longitude: coords.lng }],
        replace: false,
      }),
    });
    if (res.ok) {
      const listRes = await fetch(`/api/corporate/requests/${requestId}/employees`);
      if (listRes.ok) setEmployees((await listRes.json()).employees);
      onChange?.();
    }
    setNewRow({ name: "", address: "", phone: "" });
    setAdding(false);
    setAddGeoState("idle");
    setAddSaving(false);
  }

  async function handleAddSaveAnyway() {
    // user chose to save despite address not being geocodable
    setAddSaving(true);
    const res = await fetch(`/api/corporate/requests/${requestId}/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employees: [newRow], replace: false }),
    });
    if (res.ok) {
      const listRes = await fetch(`/api/corporate/requests/${requestId}/employees`);
      if (listRes.ok) setEmployees((await listRes.json()).employees);
      onChange?.();
    }
    setNewRow({ name: "", address: "", phone: "" });
    setAdding(false);
    setAddGeoState("idle");
    setAddSaving(false);
  }

  // ── CSV upload → validate → review ─────────────────────────

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = "";

    const text = await file.text();
    const rows = text.split(/\r?\n/).slice(1).filter(Boolean);
    const parsed: ParsedRow[] = rows
      .map((row) => {
        const cols = parseCsvRow(row);
        return { name: (cols[0] ?? "").trim(), address: (cols[1] ?? "").trim(), phone: (cols[2] ?? "").trim() };
      })
      .filter((r) => r.name && r.address);

    if (!parsed.length) return;

    // Geocode all in parallel (Mapbox has no 1 req/s limit)
    setUploadPhase("geocoding");
    setGeocodingProgress({ done: 0, total: parsed.length });
    setValidRows([]);
    setInvalidRows([]);

    let done = 0;
    const results = await Promise.all(
      parsed.map(async (row) => {
        const coords = await geocodeSingle(`${row.address}, India`);
        setGeocodingProgress({ done: ++done, total: parsed.length });
        return { row, coords };
      })
    );

    const valid: ValidatedRow[] = [];
    const invalid: InvalidRow[] = [];
    for (const { row, coords } of results) {
      if (coords) valid.push({ ...row, lat: coords.lat, lng: coords.lng });
      else invalid.push({ ...row, reason: "Address not found on map" });
    }

    setValidRows(valid);
    setInvalidRows(invalid);
    setUploadPhase("review");
  }

  async function confirmUpload() {
    if (!validRows.length) return;
    // Enforce 100-employee cap on upload
    const capped = validRows.slice(0, MAX_EMPLOYEES);
    setUploading(true);
    await fetch(`/api/corporate/requests/${requestId}/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employees: capped.map((r) => ({
          name: r.name,
          address: r.address,
          phone: r.phone || undefined,
          latitude: r.lat,
          longitude: r.lng,
        })),
        replace: true,
      }),
    });
    const listRes = await fetch(`/api/corporate/requests/${requestId}/employees`);
    if (listRes.ok) setEmployees((await listRes.json()).employees);
    onChange?.();
    setUploadPhase("idle");
    setUploading(false);
  }

  // ── CSV download ────────────────────────────────────────────

  function downloadCsv() {
    const header = "Name,Address,Phone";
    const rows = employees.map(
      (e) => `${escapeCsv(e.name)},${escapeCsv(e.address)},${escapeCsv(e.phone ?? "")}`
    );
    const csv = [header, ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employees-${requestId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputCls = "rounded border border-gray-300 px-2 py-1 text-sm focus:border-violet-400 focus:outline-none w-full";

  // ── render ──────────────────────────────────────────────────

  return (
    <div>
      {/* ── Geocoding progress overlay ── */}
      {uploadPhase === "geocoding" && (
        <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 p-5 text-center">
          <div className="mb-2 text-2xl animate-spin inline-block">⏳</div>
          <p className="font-semibold text-violet-800">Validating addresses on map…</p>
          <p className="text-sm text-violet-600 mt-1">
            {geocodingProgress.done} of {geocodingProgress.total} checked
          </p>
          <div className="mt-3 h-2 rounded-full bg-violet-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-600 transition-all duration-300"
              style={{ width: `${(geocodingProgress.done / geocodingProgress.total) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-violet-400">Powered by Mapbox</p>
        </div>
      )}

      {/* ── Validation review panel ── */}
      {uploadPhase === "review" && (
        <div className="mb-4 space-y-3">
          {/* Valid */}
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600 font-bold text-sm">✅ {validRows.length} employee{validRows.length !== 1 ? "s" : ""} validated — will be uploaded</span>
            </div>
            {validRows.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                {validRows.map((r, i) => (
                  <div key={i} className="text-xs text-green-700 flex gap-2">
                    <span className="font-medium w-32 truncate">{r.name}</span>
                    <span className="text-green-500">{r.address}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invalid */}
          {invalidRows.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-red-600 font-bold text-sm">
                  ❌ {invalidRows.length} employee{invalidRows.length !== 1 ? "s" : ""} could not be mapped — will NOT be uploaded
                </span>
              </div>
              <p className="text-xs text-red-500 mb-2">
                These addresses could not be found on the map. Please correct them and re-upload, or add them manually.
              </p>
              <div className="max-h-36 overflow-y-auto space-y-1.5">
                {invalidRows.map((r, i) => (
                  <div key={i} className="rounded bg-red-100 px-2 py-1.5 text-xs">
                    <span className="font-semibold text-red-700">{r.name}</span>
                    <span className="mx-1 text-red-400">—</span>
                    <span className="text-red-600">{r.address}</span>
                    <span className="ml-2 italic text-red-400">({r.reason})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cap notice */}
          {validRows.length > MAX_EMPLOYEES && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 mb-2">
              ⚠️ CSV has {validRows.length} valid rows — only the first {MAX_EMPLOYEES} will be uploaded (system limit).
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {validRows.length > 0 ? (
              <button
                onClick={confirmUpload}
                disabled={uploading}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {uploading
                  ? "Uploading…"
                  : `Upload ${Math.min(validRows.length, MAX_EMPLOYEES)} employee${Math.min(validRows.length, MAX_EMPLOYEES) !== 1 ? "s" : ""} (replace all existing)`}
              </button>
            ) : (
              <p className="text-sm text-red-600 font-medium">No valid addresses to upload. Please fix the CSV and try again.</p>
            )}
            <button
              onClick={() => setUploadPhase("idle")}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Toolbar ── */}
      {uploadPhase === "idle" && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500">
              {employees.length} / {MAX_EMPLOYEES} employees
              {employees.length >= MAX_EMPLOYEES && (
                <span className="ml-2 text-amber-600 font-medium">· limit reached</span>
              )}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                onClick={() => { setAdding(true); setAddGeoState("idle"); }}
                disabled={employees.length >= MAX_EMPLOYEES}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Add Employee
              </button>
              <label className="cursor-pointer rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                ⬆ Upload CSV
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
              </label>
              <button
                onClick={downloadCsv}
                disabled={employees.length === 0}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                ⬇ Download CSV
              </button>
            </div>
          </div>

          {/* ── Add row form ── */}
          {adding && (
            <div className="mb-3 rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-violet-700">New Employee</p>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-4">
                  <input className={inputCls} placeholder="Full name *" value={newRow.name}
                    onChange={(e) => setNewRow((r) => ({ ...r, name: e.target.value }))} />
                </div>
                <div className="col-span-5">
                  <input className={inputCls} placeholder="Home address *" value={newRow.address}
                    onChange={(e) => setNewRow((r) => ({ ...r, address: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <input className={inputCls} placeholder="Phone" value={newRow.phone}
                    onChange={(e) => setNewRow((r) => ({ ...r, phone: e.target.value }))} />
                </div>
                <div className="col-span-1 flex gap-1 items-start pt-0.5">
                  {addGeoState !== "warn" && (
                    <button onClick={handleAddSave}
                      disabled={!newRow.name || !newRow.address || addSaving}
                      className="rounded bg-violet-600 px-2 py-1 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50">
                      {addSaving && addGeoState === "checking" ? "…" : "✓"}
                    </button>
                  )}
                  <button onClick={() => { setAdding(false); setNewRow({ name: "", address: "", phone: "" }); setAddGeoState("idle"); }}
                    className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-500 hover:bg-gray-100">
                    ✕
                  </button>
                </div>
              </div>

              {/* geocode status for manual add */}
              {addGeoState === "checking" && (
                <p className="text-xs text-violet-500 animate-pulse">Checking address on map…</p>
              )}
              {addGeoState === "ok" && (
                <p className="text-xs text-green-600">✅ Address found on map</p>
              )}
              {addGeoState === "warn" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-700">
                    ⚠️ Address not found on map — this employee won't appear on the route map.
                  </p>
                  <p className="text-xs text-amber-600">
                    Check the address spelling and try saving again, or save anyway without map support.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setAddGeoState("idle")}
                      className="rounded bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-700">
                      Fix Address
                    </button>
                    <button onClick={handleAddSaveAnyway}
                      className="rounded border border-amber-400 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100">
                      Save Anyway
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Employee table ── */}
          {employees.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No employees yet. Add one above or upload a CSV.</p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase text-gray-400">
                    <th className="px-3 py-2 w-8">#</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Address</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2 w-6 text-center" title="Mappable">📍</th>
                    <th className="px-3 py-2 w-28"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {employees.map((emp, i) => {
                    const draft = editing[emp.id];
                    const isEditing = !!draft;
                    const isMapped = !!(emp.latitude && emp.longitude);
                    return (
                      <tr key={emp.id} className={isEditing ? "bg-violet-50" : "hover:bg-gray-50"}>
                        <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2">
                          {isEditing
                            ? <input className={inputCls} value={draft.name}
                                onChange={(e) => setEditing((p) => ({ ...p, [emp.id]: { ...draft, name: e.target.value } }))} />
                            : <span className="font-medium text-gray-800">{emp.name}</span>}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing
                            ? <input className={inputCls} value={draft.address}
                                onChange={(e) => setEditing((p) => ({ ...p, [emp.id]: { ...draft, address: e.target.value } }))} />
                            : <span className="text-gray-500">{emp.address}</span>}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing
                            ? <input className={inputCls} style={{ width: 100 }} value={draft.phone ?? ""}
                                onChange={(e) => setEditing((p) => ({ ...p, [emp.id]: { ...draft, phone: e.target.value } }))} />
                            : <span className="text-gray-400">{emp.phone || "—"}</span>}
                        </td>
                        <td className="px-3 py-2 text-center" title={isMapped ? "Address mapped" : "Not on map"}>
                          <span className={isMapped ? "text-green-500" : "text-gray-300"}>
                            {isMapped ? "✅" : "❌"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <button onClick={() => saveEdit(emp.id)} disabled={saving === emp.id}
                                className="rounded bg-green-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">
                                {saving === emp.id ? "…" : "Save"}
                              </button>
                              <button onClick={() => cancelEdit(emp.id)}
                                className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button onClick={() => startEdit(emp)}
                                className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100">
                                Edit
                              </button>
                              <button onClick={() => deleteEmployee(emp.id)} disabled={deleting === emp.id}
                                className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50">
                                {deleting === emp.id ? "…" : "Del"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-2 text-xs text-gray-400">
            CSV format: <code>Name, Address, Phone</code> — header row required. Addresses with commas must be quoted. All addresses are validated against the map before upload.
          </p>
        </>
      )}
    </div>
  );
}
