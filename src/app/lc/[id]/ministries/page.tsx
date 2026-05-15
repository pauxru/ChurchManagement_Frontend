"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

// Combined Ministries view: Fellowships on top, Groups below.
// Each section keeps its own local state — no shared store, no extracted
// helpers — so the merged page mirrors the standalone pages 1:1.

interface Fellowship {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface Group {
  id: number;
  name: string;
  description: string | null;
  leaderUserAccountId: string | null;
  isActive: boolean;
  isDefault: boolean;
}

export default function MinistriesPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;

  // ---- Fellowships state ----
  const [fellowships, setFellowships] = useState<Fellowship[]>([]);
  const [fellowshipName, setFellowshipName] = useState("");
  const [fellowshipDescription, setFellowshipDescription] = useState("");
  const [fellowshipError, setFellowshipError] = useState<string | null>(null);

  const refreshFellowships = useCallback(async () => {
    if (!token) return;
    try {
      setFellowships(await apiFetch<Fellowship[]>(`/Lc/${lcId}/Fellowships`, token));
    } catch (e) {
      setFellowshipError((e as Error).message);
    }
  }, [lcId, token]);
  useEffect(() => { refreshFellowships(); }, [refreshFellowships]);

  async function createFellowship() {
    if (!token || !fellowshipName) return;
    try {
      await apiFetch(`/Lc/${lcId}/Fellowships`, token, {
        method: "POST",
        json: { name: fellowshipName, description: fellowshipDescription, isActive: false },
      });
      setFellowshipName(""); setFellowshipDescription("");
      refreshFellowships();
    } catch (e) {
      setFellowshipError((e as Error).message);
    }
  }

  // ---- Groups state ----
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupError, setGroupError] = useState<string | null>(null);

  const refreshGroups = useCallback(async () => {
    if (!token) return;
    try {
      setGroups(await apiFetch<Group[]>(`/Lc/${lcId}/Groups`, token));
    } catch (e) {
      setGroupError((e as Error).message);
    }
  }, [lcId, token]);
  useEffect(() => { refreshGroups(); }, [refreshGroups]);

  async function createGroup() {
    if (!token || !groupName) return;
    try {
      await apiFetch(`/Lc/${lcId}/Groups`, token, {
        method: "POST",
        json: { name: groupName, description: groupDescription, isActive: false },
      });
      setGroupName(""); setGroupDescription("");
      refreshGroups();
    } catch (e) {
      setGroupError((e as Error).message);
    }
  }

  async function removeGroup(g: Group) {
    if (!token) return;
    if (g.isDefault) return; // UI also prevents this
    if (!confirm(`Delete group "${g.name}"?`)) return;
    try {
      await apiFetch(`/Lc/${lcId}/Groups/${g.id}`, token, { method: "DELETE" });
      refreshGroups();
    } catch (e) {
      setGroupError((e as Error).message);
    }
  }

  return (
    <div className="container mx-auto px-6 py-6 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ministries</h1>
        <p className="text-sm text-gray-600 mt-1">
          Fellowships and groups that meet within this Local Church.
        </p>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-1">Fellowships</h2>
        <p className="text-sm text-gray-500 mb-4">
          Prayer cells, study groups, and seasonal gatherings.
        </p>
        <div className="bg-white shadow rounded p-4 mb-4 space-y-2">
          <input
            value={fellowshipName}
            onChange={(e) => setFellowshipName(e.target.value)}
            placeholder="Fellowship name"
            className="w-full border px-3 py-2 rounded"
          />
          <input
            value={fellowshipDescription}
            onChange={(e) => setFellowshipDescription(e.target.value)}
            placeholder="Description"
            className="w-full border px-3 py-2 rounded"
          />
          <button
            onClick={createFellowship}
            disabled={!fellowshipName}
            className="bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Create fellowship
          </button>
        </div>
        {fellowshipError && <div className="text-red-700">{fellowshipError}</div>}
        <ul className="space-y-2">
          {fellowships.length === 0 && <li className="text-gray-500">No fellowships yet.</li>}
          {fellowships.map((f) => (
            <li key={f.id} className="bg-white shadow rounded p-4">
              <div className="flex justify-between">
                <div className="font-medium">{f.name}</div>
                <span className={`px-2 py-1 rounded text-xs ${f.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>
                  {f.isActive ? "Active" : "Forming"}
                </span>
              </div>
              {f.description && <p className="text-sm text-gray-600 mt-1">{f.description}</p>}
            </li>
          ))}
        </ul>
      </section>

      <div className="my-10 border-t border-gray-200" />

      <section>
        <h2 className="text-xl font-semibold mb-1">Groups</h2>
        <p className="text-sm text-gray-500 mb-2">
          Standing committees and ministries (treasury, choir, youth, etc.).
        </p>
        <p className="text-sm text-gray-600 mb-3">
          Default groups are seeded automatically. You can edit any group, but the
          eight defaults cannot be removed. Additional non-default groups can be
          created below.
        </p>
        <div className="bg-white shadow rounded p-4 mb-4 space-y-2">
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="w-full border px-3 py-2 rounded"
          />
          <input
            value={groupDescription}
            onChange={(e) => setGroupDescription(e.target.value)}
            placeholder="Description"
            className="w-full border px-3 py-2 rounded"
          />
          <button
            onClick={createGroup}
            disabled={!groupName}
            className="bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Create group
          </button>
        </div>
        {groupError && <div className="text-red-700">{groupError}</div>}
        <ul className="space-y-2">
          {groups.length === 0 && <li className="text-gray-500">No groups yet.</li>}
          {groups.map((g) => (
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
                    <button onClick={() => removeGroup(g)} className="text-red-700 text-sm underline">Delete</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
