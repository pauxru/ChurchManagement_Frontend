"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";

interface DioceseRow { dioceseId: number; dioceseName: string; }
interface ParishRow {
  parishId: number;
  parishName: string;
  description: string | null;
  dioceseID: number;
  headquarterChurchID: number | null;
}

export default function AdminParishesPage() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const [dioceses, setDioceses] = useState<DioceseRow[] | null>(null);
  const [dioceseId, setDioceseId] = useState<number | null>(null);
  const [parishes, setParishes] = useState<ParishRow[] | null>(null);
  const [editing, setEditing] = useState<ParishRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch<DioceseRow[]>("/Churches/diocese", token)
      .then((d) => {
        setDioceses(d);
        if (d.length > 0) setDioceseId(d[0].dioceseId);
      })
      .catch((e) => setError(e.message));
  }, [token]);

  useEffect(() => {
    if (!token || !dioceseId) return;
    apiFetch<ParishRow[]>(`/Churches/diocese-parishes/${dioceseId}`, token)
      .then(setParishes)
      .catch((e) => setError(e.message));
  }, [token, dioceseId]);

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/Admin/parish/${editing.parishId}`, token, {
        method: "PUT",
        json: editing,
      });
      setEditing(null);
      if (dioceseId) {
        const refreshed = await apiFetch<ParishRow[]>(`/Churches/diocese-parishes/${dioceseId}`, token);
        setParishes(refreshed);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <div className="p-8">Loading…</div>;
  if (!session?.user) return <div className="p-8">Please sign in.</div>;

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Manage Parishes</h1>
        <Link href="/admin" className="text-sm text-red-700 hover:underline">← Admin</Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{error}</div>}

      {dioceses && dioceses.length > 1 && (
        <label className="block mb-4">
          <span className="text-sm text-gray-600">Diocese</span>
          <select
            value={dioceseId ?? ""}
            onChange={(e) => setDioceseId(Number(e.target.value))}
            className="mt-1 w-full sm:w-auto border border-gray-300 rounded px-3 py-2"
          >
            {dioceses.map((d) => (
              <option key={d.dioceseId} value={d.dioceseId}>{d.dioceseName}</option>
            ))}
          </select>
        </label>
      )}

      {!parishes && <p className="text-gray-500">Loading parishes…</p>}
      {parishes && parishes.length === 0 && <p className="text-gray-500">No parishes in this diocese.</p>}
      {parishes && parishes.length > 0 && (
        <table className="w-full border border-gray-200 rounded overflow-hidden">
          <thead className="bg-gray-50 text-sm">
            <tr className="text-left">
              <th className="px-3 py-2">Parish</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {parishes.map((p) => (
              <tr key={p.parishId} className="border-t border-gray-200">
                <td className="px-3 py-2 font-medium">{p.parishName}</td>
                <td className="px-3 py-2 text-sm text-gray-600">{p.description ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => setEditing(p)}
                    className="text-sm text-red-700 hover:underline"
                  >
                    Rename
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mt-20 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Rename parish</h2>
            <label className="block">
              <span className="text-sm text-gray-600">Parish name</span>
              <input
                type="text"
                value={editing.parishName}
                onChange={(e) => setEditing({ ...editing, parishName: e.target.value })}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
              />
            </label>
            <label className="block mt-3">
              <span className="text-sm text-gray-600">Description (optional)</span>
              <textarea
                rows={2}
                value={editing.description ?? ""}
                onChange={(e) => setEditing({ ...editing, description: e.target.value || null })}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
              />
            </label>
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
    </div>
  );
}
