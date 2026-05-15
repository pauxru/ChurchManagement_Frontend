"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { useCanManageOfficials } from "@/lib/permissions";

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

interface OfficialEntry {
  id: number;
  name: string | null;
  position: number | null;
  positionDetail: string | null;
  isActive: boolean;
  photoUrl: string | null;
}
interface LeadershipView { officials: OfficialEntry[] }

export default function LeadershipPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;
  // Read-only on this page by design. Edit/manage flows live behind the
  // admin route; the link below surfaces it for users who have access.
  const canManage = useCanManageOfficials();

  const [view, setView] = useState<LeadershipView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setView(await apiFetch<LeadershipView>(`/Lc/${lcId}/Leadership`, token));
    } catch (e) { setError((e as Error).message); }
  }, [lcId, token]);
  useEffect(() => { refresh(); }, [refresh]);

  if (!view) return <div className="container mx-auto px-6 py-6">{error ?? "Loading..."}</div>;

  const officials = view.officials ?? [];

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold">Church leadership</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Read-only view of the elected officials. To add or edit, use the admin tools.
          </p>
        </div>
        {canManage && (
          <Link
            href="/admin/officials"
            className="text-sm bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded"
          >
            Manage officials →
          </Link>
        )}
      </div>

      {error && <div className="text-red-700">{error}</div>}

      <section className="bg-white shadow rounded">
        <h3 className="font-semibold px-4 py-3 border-b">Local Church Officials</h3>
        {officials.length === 0 && <p className="px-4 py-4 text-gray-500">No officials on record yet.</p>}
        <ul>
          {officials.map((o) => (
            <li key={`o-${o.id}`} className={`px-4 py-3 border-t flex items-center gap-3 ${o.isActive ? "" : "opacity-60"}`}>
              {o.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.photoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-700 to-red-900 text-white flex items-center justify-center text-sm font-bold">
                  {(o.name ?? "?").trim().slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="font-medium">{o.name ?? "Unnamed official"}</div>
                <div className="text-xs text-gray-500">
                  {o.position != null ? POSITION_LABEL[o.position] ?? "Member" : "Unassigned"}
                  {o.positionDetail ? ` · ${o.positionDetail}` : ""}
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${o.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>
                {o.isActive ? "Active" : "Inactive"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
