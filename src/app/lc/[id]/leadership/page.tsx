"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";
import { RoleTier } from "@/auth";

// Mirrors backend Models/Enums.cs Position. Lay board officers only —
// clergy roles live in ClergyRanks, not here.
const POSITION_LABEL: Record<number, string> = {
  1: "Chairperson",
  2: "Vice Chairperson",
  3: "Chairlady",
  4: "Vice Chairlady",
  5: "Secretary",
  6: "Vice Secretary",
  7: "Treasurer",
  8: "Vice Treasurer",
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

      {/* Clergy section moved to the Vestry on the LC overview — this tab
          now focuses purely on the elected lay board (officials). */}

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
