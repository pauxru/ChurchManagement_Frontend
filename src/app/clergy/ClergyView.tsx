"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface ClergyDto {
  clergyId: number;
  clergyName: string;
  rank: number;
  rankLabel: string;
  salutation: string;
  level: number;
  assignmentName: string | null;
  ordinationYear: number | null;
  photoUrl: string | null;
}

// Display order: most senior at the top.
const RANK_ORDER = [
  "PresidingArchbishop",
  "ArchBishop",
  "Bishop",
  "ArchDeacon",
  "Pastor",
  "Deacon",
  "ChurchLeader",
  "Evangelist",
];

const RANK_PRETTY: Record<string, string> = {
  PresidingArchbishop: "Presiding Archbishop",
  ArchBishop: "Archbishops",
  Bishop: "Bishops",
  ArchDeacon: "Archdeacons",
  Pastor: "Pastors",
  Deacon: "Deacons",
  ChurchLeader: "Church Leaders",
  Evangelist: "Evangelists",
};

function initials(name: string): string {
  const cleaned = name
    .replace(/^(His Grace|Most Rev\.|Rt\.? Rev\.?|Bishop|Archbishop|Presiding Archbishop|Ven\.|Rev\.|Deacon|Church Leader)\s+/i, "")
    .replace(/\([^)]*\)/g, "")
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface Props {
  clergy: ClergyDto[];
}

export function ClergyView({ clergy }: Props) {
  const [query, setQuery] = useState<string>("");
  const [rankFilter, setRankFilter] = useState<string>("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clergy.filter((c) => {
      if (rankFilter && c.rankLabel !== rankFilter) return false;
      if (!q) return true;
      return (
        c.clergyName.toLowerCase().includes(q) ||
        (c.assignmentName ?? "").toLowerCase().includes(q)
      );
    });
  }, [clergy, query, rankFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, ClergyDto[]>();
    for (const c of filtered) {
      const key = c.rankLabel;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    // Sort entries by RANK_ORDER, with unknown ranks last.
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ia = RANK_ORDER.indexOf(a);
      const ib = RANK_ORDER.indexOf(b);
      const da = ia === -1 ? 999 : ia;
      const db = ib === -1 ? 999 : ib;
      return da - db;
    });
  }, [filtered]);

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-3 items-end">
        <label className="flex-1 min-w-[200px]">
          <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
            Search
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or assignment…"
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </label>
        <label>
          <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
            Rank
          </span>
          <select
            value={rankFilter}
            onChange={(e) => setRankFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">All ranks</option>
            {RANK_ORDER.map((r) => (
              <option key={r} value={r}>{RANK_PRETTY[r] ?? r}</option>
            ))}
          </select>
        </label>
        {(rankFilter || query) && (
          <button
            onClick={() => { setRankFilter(""); setQuery(""); }}
            className="text-sm text-red-700 hover:underline pb-2"
          >
            Clear
          </button>
        )}
        <span className="text-sm text-gray-600 pb-2 ml-auto">
          Showing <strong>{filtered.length}</strong> of {clergy.length}
        </span>
      </div>

      {grouped.length === 0 ? (
        <p className="mt-10 text-gray-500">No clergy match those filters.</p>
      ) : (
        <div className="mt-8 space-y-10">
          {grouped.map(([rankKey, members]) => (
            <section key={rankKey}>
              <h2 className="text-xl font-bold text-red-900 border-b border-red-200 pb-1 mb-4">
                {RANK_PRETTY[rankKey] ?? rankKey}
                <span className="text-gray-400 font-normal text-sm ml-2">· {members.length}</span>
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {members.map((c) => (
                  <li key={c.clergyId}>
                    <Link
                      href={`/clergy/${c.clergyId}`}
                      className="block border border-gray-200 rounded-lg p-5 text-center hover:shadow-md hover:border-red-300 transition"
                    >
                      {c.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.photoUrl}
                          alt={c.clergyName}
                          className="mx-auto w-20 h-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="mx-auto w-20 h-20 rounded-full bg-red-100 text-red-800 flex items-center justify-center font-bold text-xl">
                          {initials(c.clergyName)}
                        </div>
                      )}
                      <h3 className="mt-3 font-semibold">
                        {c.salutation ? `${c.salutation}. ` : ""}{c.clergyName}
                      </h3>
                      {c.assignmentName && (
                        <p className="mt-1 text-sm text-gray-600">{c.assignmentName}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
