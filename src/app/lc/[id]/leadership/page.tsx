"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";

// The eight canonical seats every LC has. Rendered as placeholder rows
// when nobody holds the position so the page reads as "we have a
// Treasurer slot, it's just open" rather than "no officials".
const OFFICIAL_SEATS: Array<{ position: number; title: string }> = [
  { position: 1, title: "Chairperson" },
  { position: 2, title: "Vice Chairperson" },
  { position: 3, title: "Chairlady" },
  { position: 4, title: "Vice Chairlady" },
  { position: 5, title: "Secretary" },
  { position: 6, title: "Vice Secretary" },
  { position: 7, title: "Treasurer" },
  { position: 8, title: "Vice Treasurer" },
];

interface OfficialEntry {
  id: number;
  name: string | null;
  position: number | null;
  positionDetail: string | null;
  isActive: boolean;
  photoUrl: string | null;
}
interface LeadershipView { officials: OfficialEntry[] }

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0].slice(0, 2) || parts[0][0] || "?").toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function LeadershipPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [view, setView] = useState<LeadershipView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setView(await apiFetch<LeadershipView>(`/Lc/${lcId}/Leadership`, token));
    } catch (e) { setError((e as Error).message); }
  }, [lcId, token]);
  useEffect(() => { refresh(); }, [refresh]);

  // Render the page shell even before officials load — the eight seat
  // placeholders give the user a sense of the structure immediately.
  const officials = view?.officials ?? [];
  const other = officials.filter(o => o.position == null || o.position > 8);

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold">Church leadership</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Elected officials of this Local Church. To add or edit, use the admin tools.
          </p>
        </div>
        <Link
          href="/admin/officials"
          className="text-sm bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded"
        >
          Manage officials →
        </Link>
      </div>

      {error && <div className="text-sm text-red-700">{error}</div>}

      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {OFFICIAL_SEATS.map((seat) => {
          const filled = officials.find(o => o.position === seat.position && o.isActive);
          return (
            <li key={seat.position} className={`bg-white border border-gray-200 rounded-xl px-3 pt-4 pb-3 text-center ${filled ? "" : "border-dashed"}`}>
              {filled?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={filled.photoUrl} alt={filled.name ?? ""} className="mx-auto w-24 h-24 rounded-full object-cover ring-4 ring-white shadow" />
              ) : (
                <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center font-bold text-2xl ring-4 ring-white shadow ${filled ? "bg-gradient-to-br from-red-700 to-red-900 text-white" : "bg-gray-100 text-gray-400"}`}>
                  {filled?.name ? initials(filled.name) : "—"}
                </div>
              )}
              <h4 className={`mt-2 font-semibold text-sm ${filled ? "text-gray-900" : "text-gray-400"}`}>
                {filled?.name ?? "Vacant"}
              </h4>
              <p className="text-xs text-gray-600 mt-0.5">{seat.title}</p>
            </li>
          );
        })}
      </ul>

      {other.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-gray-700 mb-3">Other officials</h3>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {other.map((o) => (
              <li key={o.id} className={`bg-white border border-gray-200 rounded-xl px-3 pt-4 pb-3 text-center ${o.isActive ? "" : "opacity-60"}`}>
                <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-red-700 to-red-900 text-white flex items-center justify-center font-bold text-2xl ring-4 ring-white shadow">
                  {initials(o.name)}
                </div>
                <h4 className="mt-2 font-semibold text-sm">{o.name ?? "Unnamed"}</h4>
                <p className="text-xs text-gray-600 mt-0.5">{o.positionDetail ?? "Member"}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
