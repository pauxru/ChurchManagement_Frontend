"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";
import { RoleTier } from "@/auth";

// Mirrors backend Models/Enums.cs.
const CLERGY_RANK_LABEL: Record<number, string> = {
  1: "Evangelist",
  2: "Church Leader",
  3: "Deacon",
  4: "Pastor",
  5: "Arch Deacon",
  6: "Bishop",
  7: "Arch Bishop",
  8: "Presiding Archbishop",
};
const POSITION_LABEL: Record<number, string> = {
  1: "Pastor",
  2: "Treasurer",
  3: "Chairperson",
  4: "Secretary",
  5: "Vice Chair",
  6: "Member",
  7: "Other",
};

interface LeadershipEntry {
  kind: "Clergy" | "Official";
  id: number;
  name: string | null;
  rank: number | null;
  position: number | null;
  positionDetail: string | null;
  isActive: boolean;
  photoUrl: string | null;
}

interface LeadershipView {
  clergy: LeadershipEntry[];
  officials: LeadershipEntry[];
}

export default function LeadershipPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;
  const tier = session?.profile?.roleLabel?.tier ?? 0;
  // Per spec: only admins / bishops (tier >= Bishop) can add/edit/remove.
  const canManage = tier >= RoleTier.Bishop;

  const [view, setView] = useState<LeadershipView | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const url = `/Lc/${lcId}/Leadership${showInactive ? "?includeInactive=true" : ""}`;
      setView(await apiFetch<LeadershipView>(url, token));
    } catch (e) { setError((e as Error).message); }
  }, [lcId, token, showInactive]);
  useEffect(() => { refresh(); }, [refresh]);

  async function softDeleteClergy(id: number) {
    if (!token) return;
    if (!confirm("Deactivate this clergy member?")) return;
    try {
      await apiFetch(`/Admin/clergy/${id}`, token, { method: "DELETE" });
      refresh();
    } catch (e) { setError((e as Error).message); }
  }

  if (!view) return <div className="container mx-auto px-6 py-6">{error ?? "Loading..."}</div>;

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Church leadership</h2>
        <div className="flex items-center gap-3">
          {canManage && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
              Show inactive
            </label>
          )}
          {!canManage && (
            <span className="text-xs text-gray-500">Read-only view. Only Bishops or higher can manage leaders.</span>
          )}
        </div>
      </div>

      {error && <div className="text-red-700">{error}</div>}

      <section className="bg-white shadow rounded">
        <h3 className="font-semibold px-4 py-3 border-b">Clergy at this LC</h3>
        {view.clergy.length === 0 && <p className="px-4 py-4 text-gray-500">No clergy stationed here.</p>}
        <ul>
          {view.clergy.map((c) => (
            <li key={`c-${c.id}`} className={`px-4 py-3 border-t flex items-center gap-3 ${c.isActive ? "" : "opacity-60"}`}>
              {c.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.photoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                  {(c.name ?? "?").slice(0, 1)}
                </div>
              )}
              <div className="flex-1">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-gray-500">{c.rank != null ? CLERGY_RANK_LABEL[c.rank] : ""}</div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${c.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>
                {c.isActive ? "Active" : "Inactive"}
              </span>
              {canManage && c.isActive && (
                <button onClick={() => softDeleteClergy(c.id)} className="text-red-700 underline text-sm">Remove</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white shadow rounded">
        <h3 className="font-semibold px-4 py-3 border-b">Local Church Officials</h3>
        {view.officials.length === 0 && <p className="px-4 py-4 text-gray-500">No verified officials yet.</p>}
        <ul>
          {view.officials.map((o) => (
            <li key={`o-${o.id}`} className={`px-4 py-3 border-t flex items-center gap-3 ${o.isActive ? "" : "opacity-60"}`}>
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">#{o.id}</div>
              <div className="flex-1">
                <div className="font-medium">
                  {o.position != null ? POSITION_LABEL[o.position] : "Unassigned"}
                  {o.positionDetail ? <span className="text-sm text-gray-600 ml-1">({o.positionDetail})</span> : null}
                </div>
                <div className="text-xs text-gray-500">Local Church Official</div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${o.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>
                {o.isActive ? "Active" : "Inactive"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {canManage && (
        <p className="text-xs text-gray-500">
          To add a new clergy member or official, use the Admin tools at <code>/admin/clergy</code> and <code>/admin/officials</code>.
        </p>
      )}
    </div>
  );
}
