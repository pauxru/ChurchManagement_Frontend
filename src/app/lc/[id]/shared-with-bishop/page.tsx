"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

interface SharedView {
  lcId: number;
  officials: Array<{ id: number; position: number | null; positionDetail: string | null; verificationStatus: number }>;
  activePlans: Array<{ id: number; title: string; startDate: string; endDate: string | null }>;
  upcomingEvents: Array<{ eventID: number; eventTitle: string; eventStartDate: string }>;
  memberCount: number;
}

export default function SharedWithBishopPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [view, setView] = useState<SharedView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<SharedView>(`/Lc/${lcId}/shared-with-bishop`, token).then(setView).catch((e) => setError(e.message));
  }, [lcId, token]);

  if (error) return <div className="text-red-700">{error}</div>;
  if (!view) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
        This is exactly what the Bishop sees for your local church. Updating any of these fields
        elsewhere on this site is automatically reflected here — no hidden channels.
      </div>

      <section className="bg-white shadow rounded p-4">
        <h2 className="font-semibold mb-2">Officials</h2>
        <p className="text-sm text-gray-600">{view.officials.length} verified/pending</p>
        <ul className="mt-2 text-sm space-y-1">
          {view.officials.map((o) => (
            <li key={o.id}>
              Official #{o.id} — Position {o.position ?? "—"}{o.positionDetail ? ` (${o.positionDetail})` : ""} — status {o.verificationStatus}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white shadow rounded p-4">
        <h2 className="font-semibold mb-2">Active plans</h2>
        <ul className="mt-2 text-sm space-y-1">
          {view.activePlans.length === 0 && <li className="text-gray-500">None.</li>}
          {view.activePlans.map((p) => (
            <li key={p.id}>{p.title} — {p.startDate}{p.endDate ? ` → ${p.endDate}` : ""}</li>
          ))}
        </ul>
      </section>

      <section className="bg-white shadow rounded p-4">
        <h2 className="font-semibold mb-2">Upcoming events</h2>
        <ul className="mt-2 text-sm space-y-1">
          {view.upcomingEvents.length === 0 && <li className="text-gray-500">None.</li>}
          {view.upcomingEvents.map((e) => (
            <li key={e.eventID}>{e.eventTitle} — {e.eventStartDate}</li>
          ))}
        </ul>
      </section>

      <section className="bg-white shadow rounded p-4">
        <h2 className="font-semibold mb-2">Member count</h2>
        <p className="text-3xl font-bold">{view.memberCount}</p>
      </section>
    </div>
  );
}
