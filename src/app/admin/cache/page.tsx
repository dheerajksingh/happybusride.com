"use client";

import { useEffect, useRef, useState } from "react";

interface CacheEntry {
  key: string;
  meta: {
    uploadedAt: string;
    count: number;
    columns: string[];
    source: string;
  } | null;
}

const PRESET_KEYS = ["cities", "states", "amenities"];

export default function CacheManagementPage() {
  const [entries, setEntries] = useState<CacheEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload form state
  const [cacheKey, setCacheKey] = useState("cities");
  const [customKey, setCustomKey] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadEntries() {
    setLoading(true);
    const res = await fetch("/api/admin/cache");
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { loadEntries(); }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const key = cacheKey === "__custom__" ? customKey.trim() : cacheKey;
    if (!key) { setResult({ type: "error", msg: "Cache key is required" }); return; }
    if (!file) { setResult({ type: "error", msg: "Please select a CSV file" }); return; }

    setUploading(true);
    const fd = new FormData();
    fd.append("cacheKey", key);
    fd.append("file", file);

    const res = await fetch("/api/admin/cache/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);

    if (res.ok) {
      setResult({
        type: "success",
        msg: `✓ Loaded ${data.count} records into "${data.cacheKey}"${data.dbSynced ? " (DB synced)" : ""}`,
      });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      loadEntries();
    } else {
      setResult({ type: "error", msg: data.error ?? "Upload failed" });
    }
  }

  async function handleDelete(key: string) {
    if (!confirm(`Clear cache "${key}"?`)) return;
    await fetch(`/api/admin/cache/${key}`, { method: "DELETE" });
    loadEntries();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Cache Management</h1>

      {/* Upload section */}
      <section className="rounded-xl bg-gray-800 p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">Upload CSV to Cache</h2>
        <p className="mb-4 text-xs text-gray-500">
          Upload a CSV file to populate a Redis cache key. For the <code className="text-blue-400">cities</code> key,
          records are also synced to the database. Supported columns for cities:
          <span className="text-gray-300"> name/city, state, latitude/lat, longitude/lng, code</span>.
        </p>

        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Cache Key</label>
            <div className="flex gap-2">
              <select
                value={cacheKey}
                onChange={(e) => setCacheKey(e.target.value)}
                className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                {PRESET_KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
                <option value="__custom__">Custom key...</option>
              </select>
              {cacheKey === "__custom__" && (
                <input
                  type="text"
                  placeholder="my_cache_key"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">CSV File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700"
            />
            {file && (
              <p className="mt-1 text-xs text-gray-400">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
            )}
          </div>

          {result && (
            <p className={`rounded-lg px-4 py-3 text-sm ${result.type === "success" ? "bg-green-900/40 text-green-300" : "bg-red-900/40 text-red-400"}`}>
              {result.msg}
            </p>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload & Cache"}
          </button>
        </form>
      </section>

      {/* Existing cache keys */}
      <section className="rounded-xl bg-gray-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Cached Keys ({entries.length})
          </h2>
          <button onClick={loadEntries} className="text-xs text-blue-400 hover:underline">
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-gray-500">No cache entries yet. Upload a CSV to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-left text-xs uppercase text-gray-400">
                  <th className="pb-2 pr-4">Key</th>
                  <th className="pb-2 pr-4">Records</th>
                  <th className="pb-2 pr-4">Columns</th>
                  <th className="pb-2 pr-4">Last Updated</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(({ key, meta }) => (
                  <tr key={key} className="border-b border-gray-700">
                    <td className="py-3 pr-4 font-mono text-blue-400">{key}</td>
                    <td className="py-3 pr-4 text-white">{meta?.count ?? "—"}</td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">{meta?.columns?.join(", ") ?? "—"}</td>
                    <td className="py-3 pr-4 text-gray-400">
                      {meta?.uploadedAt ? new Date(meta.uploadedAt).toLocaleString() : "—"}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleDelete(key)}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Clear
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
