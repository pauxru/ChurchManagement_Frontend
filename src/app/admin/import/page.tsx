"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { apiUpload } from "@/lib/apiClient";

const ENTITY_KEYS = [
  "archdiocese",
  "diocese",
  "parish",
  "localchurch",
  "churchmember",
  "clergy",
  "event",
  "announcement",
  "leadershipboard",
  "useraccount",
] as const;

interface ImportRowError { rowNumber: number; reason: string; }
interface BulkImportResult {
  success: boolean;
  insertedCount: number;
  failedCount: number;
  errors: ImportRowError[];
}

export default function ImportPage() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const [entity, setEntity] = useState<string>("archdiocese");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (!session?.user) return <div className="p-8">Please sign in.</div>;

  async function submit() {
    if (!file) { setError("Choose a CSV file first."); return; }
    setError(null); setResult(null); setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await apiUpload<BulkImportResult>(`/Admin/import/${entity}`, token, fd);
      setResult(data);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Bulk CSV import</h1>
      <p className="text-gray-600 mb-6">
        Upload one of the templates from <code>data-templates/</code>. Insert order matters
        when the entity has foreign keys — load parents (ArchDiocese → Diocese → Parish → LocalChurch)
        before children. Imports require National-admin scope.
      </p>

      <div className="bg-white shadow rounded p-4 space-y-4">
        <label className="block">
          <span className="block text-sm font-medium mb-1">Entity</span>
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="border px-3 py-2 rounded w-full"
          >
            {ENTITY_KEYS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-sm font-medium mb-1">CSV file</span>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <button
          onClick={submit}
          disabled={busy || !file}
          className="bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {busy ? "Importing…" : "Import"}
        </button>

        {error && <p className="text-red-700">{error}</p>}

        {result && (
          <div className={`p-3 rounded ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <div className="font-semibold">
              {result.success ? `Inserted ${result.insertedCount} rows.` : `Failed: ${result.failedCount} errors.`}
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-2 text-sm">
                {result.errors.map((e, i) => (
                  <li key={i}>Row {e.rowNumber}: {e.reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
