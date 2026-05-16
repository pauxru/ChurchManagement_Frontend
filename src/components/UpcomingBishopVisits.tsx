"use client";

// Read-only block listing the next ~5 non-cancelled Bishop visits at an
// LC. Designed to be dropped into the LC overview (`/lc/[id]/page.tsx`)
// by the dashboard agent once both branches land.
//
// Powered by the anonymous /public/local-churches/{lcId}/upcoming-visits
// endpoint — no token required, no apiClient round-trip, follows the same
// raw-fetch pattern the LC overview already uses for its public reads.

import { useEffect, useState } from "react";

interface UpcomingVisit {
  id: number;
  dioceseId: number;
  bishopClergyId: number | null;
  bishopName: string | null;
  localChurchId: number;
  localChurchName: string | null;
  localChurchCode: string | null;
  visitDate: string;          // ISO "YYYY-MM-DD"
  purpose: string;
  notes: string | null;
  isCancelled: boolean;
}

interface Props {
  localChurchId: number;
  // Soft default of 5 — matches the public endpoint's default. The backend
  // caps at 20 server-side so callers can't blow this out with a query
  // tweak.
  take?: number;
}

function formatVisitDate(iso: string): string {
  // ISO string from the backend is a local-calendar date (no time zone),
  // so parse it as such — using `new Date(iso)` would shift it by the
  // browser's offset.
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

export default function UpcomingBishopVisits({ localChurchId, take = 5 }: Props) {
  const [visits, setVisits] = useState<UpcomingVisit[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!localChurchId) return;
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";
    fetch(`${base}/public/local-churches/${localChurchId}/upcoming-visits?take=${take}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: UpcomingVisit[]) => setVisits(Array.isArray(rows) ? rows : []))
      .catch(() => setVisits([]))
      .finally(() => setLoaded(true));
  }, [localChurchId, take]);

  if (!loaded) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-800">Upcoming Bishop visits</h3>
        <p className="text-xs text-gray-400">Loading&hellip;</p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-800">Upcoming Bishop visits</h3>
      {visits.length === 0 ? (
        <p className="text-xs text-gray-500">No upcoming Bishop visits scheduled.</p>
      ) : (
        <ul className="space-y-1">
          {visits.map((v) => (
            <li
              key={v.id}
              className="text-xs border border-gray-200 rounded-md px-2 py-1.5 bg-white"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-gray-900">{formatVisitDate(v.visitDate)}</span>
                <span className="text-gray-700">{v.purpose}</span>
              </div>
              {v.bishopName && (
                <div className="text-[11px] text-gray-500 mt-0.5">with {v.bishopName}</div>
              )}
              {v.notes && (
                <div className="text-[11px] text-gray-500 truncate" title={v.notes}>{v.notes}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
