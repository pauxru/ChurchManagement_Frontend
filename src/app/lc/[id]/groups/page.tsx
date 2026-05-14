"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

interface Group {
  id: number;
  name: string;
  description: string | null;
  leaderUserAccountId: string | null;
  isActive: boolean;
  isDefault: boolean;
}

export default function GroupsPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [list, setList] = useState<Group[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try { setList(await apiFetch<Group[]>(`/Lc/${lcId}/Groups`, token)); }
    catch (e) { setError((e as Error).message); }
  }, [lcId, token]);
  useEffect(() => { refresh(); }, [refresh]);

  async function create() {
    if (!token || !name) return;
    try {
      await apiFetch(`/Lc/${lcId}/Groups`, token, { method: "POST", json: { name, description, isActive: false } });
      setName(""); setDescription(""); refresh();
    } catch (e) { setError((e as Error).message); }
  }

  async function remove(g: Group) {
    if (!token) return;
    if (g.isDefault) return; // UI also prevents this
    if (!confirm(`Delete group "${g.name}"?`)) return;
    try {
      await apiFetch(`/Lc/${lcId}/Groups/${g.id}`, token, { method: "DELETE" });
      refresh();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="container mx-auto px-6 py-6">
      <h2 className="text-xl font-semibold mb-4">Groups</h2>
      <p className="text-sm text-gray-600 mb-3">
        Default groups are seeded automatically. You can edit any group, but the
        eight defaults cannot be removed. Additional non-default groups can be
        created below.
      </p>
      <div className="bg-white shadow rounded p-4 mb-4 space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name" className="w-full border px-3 py-2 rounded" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full border px-3 py-2 rounded" />
        <button onClick={create} disabled={!name} className="bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50">Create group</button>
      </div>
      {error && <div className="text-red-700">{error}</div>}
      <ul className="space-y-2">
        {list.length === 0 && <li className="text-gray-500">No groups yet.</li>}
        {list.map((g) => (
          <li key={g.id} className="bg-white shadow rounded p-4">
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="font-medium flex items-center gap-2">
                  {g.name}
                  {g.isDefault && (
                    <span className="px-2 py-0.5 rounded text-xs bg-indigo-100 text-indigo-800">Default</span>
                  )}
                </div>
                {g.description && <p className="text-sm text-gray-600 mt-1">{g.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${g.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>
                  {g.isActive ? "Active" : "Forming"}
                </span>
                {!g.isDefault && (
                  <button onClick={() => remove(g)} className="text-red-700 text-sm underline">Delete</button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
