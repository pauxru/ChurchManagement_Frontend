"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import CreateClergyForm from "@/components/CreateClergyForm";

interface ClergyRow {
  clergyId: number;
  clergyName: string;
  rank: number;
  rankLabel: string;
  level: number;
  assignmentName: string | null;
  ordinationYear: number | null;
  photoUrl: string | null;
}

interface ClergyFull {
  clergyID: number;
  clergyName: string;
  clergyAlias: string | null;
  churchMemberID: number;
  clergyRank: number;
  levelID: number;
  ordinationDate: string;
  ordainedBy: string;
  ordinationChurch: string;
  salary: string | null;
  description: string | null;
  photoUrl: string | null;
  isActive: boolean;
}

const RANK_LABELS: Record<number, string> = {
  1: "Evangelist", 2: "Church Leader", 3: "Deacon", 4: "Pastor",
  5: "Archdeacon", 6: "Bishop", 7: "Archbishop", 8: "Presiding Archbishop",
};

export default function AdminClergyPage() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const [rows, setRows] = useState<ClergyRow[] | null>(null);
  const [editing, setEditing] = useState<ClergyFull | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refreshRows = useCallback(async () => {
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";
    try {
      const r = await fetch(`${base}/public/clergy`);
      setRows(r.ok ? await r.json() : []);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void refreshRows();
  }, [refreshRows]);

  async function openEditor(id: number) {
    setError(null);
    try {
      const full = await apiFetch<ClergyFull>(`/Clergy/${id}`, token);
      setEditing(full);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/Admin/clergy/${editing.clergyID}`, token, {
        method: "PUT",
        json: editing,
      });
      setEditing(null);
      await refreshRows();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <div className="p-8">Loading…</div>;
  if (!session?.user) return <div className="p-8">Please sign in.</div>;

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold">Manage Clergy</h1>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="bg-red-700 text-white text-sm px-4 py-2 rounded hover:bg-red-600"
          >
            + Create clergy
          </button>
          <Link href="/admin" className="text-sm text-red-700 hover:underline">← Admin</Link>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{error}</div>}
      {!rows && <p className="text-gray-500">Loading clergy…</p>}
      {rows && rows.length === 0 && <p className="text-gray-500">No clergy records yet.</p>}

      {rows && rows.length > 0 && (
        <table className="w-full border border-gray-200 rounded overflow-hidden">
          <thead className="bg-gray-50 text-sm">
            <tr className="text-left">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Rank</th>
              <th className="px-3 py-2">Assignment</th>
              <th className="px-3 py-2">Photo</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.clergyId} className="border-t border-gray-200">
                <td className="px-3 py-2 font-medium">{r.clergyName}</td>
                <td className="px-3 py-2 text-sm text-gray-600">{RANK_LABELS[r.rank] ?? r.rankLabel}</td>
                <td className="px-3 py-2 text-sm text-gray-600">{r.assignmentName ?? "—"}</td>
                <td className="px-3 py-2">
                  {r.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.photoUrl} alt={r.clergyName} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <span className="text-gray-300 text-xs">no photo</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => openEditor(r.clergyId)}
                    className="text-sm text-red-700 hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => setEditing(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg mt-12 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Edit clergy</h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-gray-600">Name</span>
                <input
                  type="text"
                  value={editing.clergyName}
                  onChange={(e) => setEditing({ ...editing, clergyName: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">Alias (optional)</span>
                <input
                  type="text"
                  value={editing.clergyAlias ?? ""}
                  onChange={(e) => setEditing({ ...editing, clergyAlias: e.target.value || null })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">Photo URL</span>
                <input
                  type="text"
                  placeholder="/bishops/<filename>.jpg or https://..."
                  value={editing.photoUrl ?? ""}
                  onChange={(e) => setEditing({ ...editing, photoUrl: e.target.value || null })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Drop the JPG into the frontend repo&apos;s <code>public/bishops/</code> folder,
                  redeploy, then paste <code>/bishops/&lt;filename&gt;.jpg</code> here.
                </p>
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">Ordained by</span>
                <input
                  type="text"
                  value={editing.ordainedBy}
                  onChange={(e) => setEditing({ ...editing, ordainedBy: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">Ordination church</span>
                <input
                  type="text"
                  value={editing.ordinationChurch}
                  onChange={(e) => setEditing({ ...editing, ordinationChurch: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-600">Description (optional)</span>
                <textarea
                  rows={3}
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value || null })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {creating && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => setCreating(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg mt-12 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Create clergy</h2>
            <CreateClergyForm
              onCreated={async () => {
                setCreating(false);
                await refreshRows();
              }}
              onCancel={() => setCreating(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
