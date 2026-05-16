"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { rankChip, rankGradient } from "@/lib/clergyColors";

export interface ClergyDto {
  clergyId: number;
  clergyName: string;
  rank: number;
  rankLabel: string;
  salutation: string;
  isInCharge?: boolean;
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
  if (parts.length === 1) return (parts[0].slice(0, 2) || parts[0][0] || "?").toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface Props {
  clergy: ClergyDto[];
}

export function ClergyView({ clergy }: Props) {
  const [query, setQuery] = useState<string>("");
  const [rankFilter, setRankFilter] = useState<string>("");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("");

  const assignments = useMemo(() => {
    const set = new Set<string>();
    for (const c of clergy) {
      if (c.assignmentName && c.assignmentName.trim()) set.add(c.assignmentName);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [clergy]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clergy.filter((c) => {
      if (rankFilter && c.rankLabel !== rankFilter) return false;
      if (assignmentFilter && c.assignmentName !== assignmentFilter) return false;
      if (!q) return true;
      return (
        c.clergyName.toLowerCase().includes(q) ||
        (c.assignmentName ?? "").toLowerCase().includes(q)
      );
    });
  }, [clergy, query, rankFilter, assignmentFilter]);

  const rankCountsUnderOtherFilters = useMemo(() => {
    const q = query.trim().toLowerCase();
    const counts = new Map<string, number>();
    for (const c of clergy) {
      if (assignmentFilter && c.assignmentName !== assignmentFilter) continue;
      if (q) {
        const hit =
          c.clergyName.toLowerCase().includes(q) ||
          (c.assignmentName ?? "").toLowerCase().includes(q);
        if (!hit) continue;
      }
      counts.set(c.rankLabel, (counts.get(c.rankLabel) ?? 0) + 1);
    }
    return counts;
  }, [clergy, query, assignmentFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, ClergyDto[]>();
    for (const c of filtered) {
      const key = c.rankLabel;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ia = RANK_ORDER.indexOf(a);
      const ib = RANK_ORDER.indexOf(b);
      const da = ia === -1 ? 999 : ia;
      const db = ib === -1 ? 999 : ib;
      return da - db;
    });
  }, [filtered]);

  const hasActiveFilter = Boolean(rankFilter || assignmentFilter || query.trim());
  const totalUnderOtherFilters = Array.from(rankCountsUnderOtherFilters.values()).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <>
      <div className="mt-6 max-w-5xl mx-auto">
        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setRankFilter("")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-red-400 ${
              rankFilter === ""
                ? "bg-gradient-to-r from-red-700 to-red-900 text-white shadow"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
            aria-pressed={rankFilter === ""}
          >
            All
            <span className="ml-1.5 opacity-75 text-xs">({totalUnderOtherFilters})</span>
          </button>
          {RANK_ORDER.map((r) => {
            const isActive = rankFilter === r;
            const count = rankCountsUnderOtherFilters.get(r) ?? 0;
            const grad = rankGradient(r);
            const chip = rankChip(r);
            // Rank with zero matches under current filters is still rendered (dimmed)
            // so the operator can see the full taxonomy.
            const disabledLook = count === 0 && !isActive;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRankFilter(isActive ? "" : r)}
                aria-pressed={isActive}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-red-400 ${
                  isActive
                    ? `bg-gradient-to-r ${grad} text-white shadow`
                    : `${chip} hover:opacity-90`
                } ${disabledLook ? "opacity-40" : ""}`}
              >
                {RANK_PRETTY[r] ?? r}
                <span className="ml-1.5 opacity-75 text-xs">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap justify-center items-end gap-3">
          <label className="flex-1 min-w-[220px] max-w-md">
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
          <label className="min-w-[220px]">
            <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
              Assignment
            </span>
            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 bg-white"
            >
              <option value="">All assignments</option>
              {assignments.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => { setRankFilter(""); setQuery(""); setAssignmentFilter(""); }}
              className="text-sm text-red-700 hover:underline pb-2"
            >
              Clear
            </button>
          )}
        </div>

        {hasActiveFilter && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {rankFilter && (
              <button
                type="button"
                onClick={() => setRankFilter("")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-800 hover:bg-gray-200"
              >
                Rank: {RANK_PRETTY[rankFilter] ?? rankFilter}
                <span aria-hidden="true">×</span>
                <span className="sr-only">Clear rank filter</span>
              </button>
            )}
            {assignmentFilter && (
              <button
                type="button"
                onClick={() => setAssignmentFilter("")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-800 hover:bg-gray-200"
              >
                Assignment: {assignmentFilter}
                <span aria-hidden="true">×</span>
                <span className="sr-only">Clear assignment filter</span>
              </button>
            )}
            {query.trim() && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-800 hover:bg-gray-200"
              >
                &ldquo;{query.trim()}&rdquo;
                <span aria-hidden="true">×</span>
                <span className="sr-only">Clear search</span>
              </button>
            )}
          </div>
        )}

        <p className="mt-3 text-center text-sm text-gray-600">
          Showing <strong>{filtered.length}</strong> of {clergy.length}
        </p>
      </div>

      {grouped.length === 0 ? (
        <p className="mt-10 text-center text-gray-500">No clergy match those filters.</p>
      ) : (
        <div className="mt-8 max-w-6xl mx-auto space-y-10">
          {grouped.map(([rankKey, members]) => {
            const tint = rankChip(rankKey);
            const grad = rankGradient(rankKey);
            return (
              <section key={rankKey}>
                <h2 className="text-center mb-4">
                  <span className={`text-xl font-bold rounded-md px-3 py-1.5 inline-flex items-baseline gap-2 ${tint}`}>
                    {RANK_PRETTY[rankKey] ?? rankKey}
                    <span className="font-normal text-sm opacity-70">· {members.length}</span>
                  </span>
                </h2>
                <ul className="flex flex-wrap justify-center gap-4">
                  {members.map((c) => (
                    <li key={c.clergyId} className="w-44">
                      <Link
                        href={`/clergy/${c.clergyId}`}
                        className={`relative block border rounded-lg p-3 text-center hover:shadow-md transition bg-white ${
                          c.isInCharge
                            ? "border-emerald-500 border-2 hover:border-emerald-600"
                            : "border-gray-200 hover:border-red-300"
                        }`}
                      >
                        {c.isInCharge && (
                          <span
                            className="absolute top-1.5 right-1.5 bg-emerald-100 text-emerald-900 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shadow-sm"
                            title="Lead clergy for this assignment"
                          >
                            In-charge
                          </span>
                        )}
                        {c.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.photoUrl}
                            alt={c.clergyName}
                            className="mx-auto w-32 h-32 rounded-full object-cover ring-4 ring-white shadow"
                          />
                        ) : (
                          <div className={`mx-auto w-32 h-32 rounded-full bg-gradient-to-br ${grad} text-white flex items-center justify-center font-bold text-4xl ring-4 ring-white shadow`}>
                            {initials(c.clergyName)}
                          </div>
                        )}
                        <h3 className="mt-4 font-semibold text-base">
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
            );
          })}
        </div>
      )}
    </>
  );
}
