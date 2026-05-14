"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface LocalChurchDto {
  localChurchId: number;
  localChurchCode: string;
  localChurchName: string;
  parishName: string | null;
  dioceseName: string | null;
  address: string | null;
  inChargePastorName: string | null;
  status: string;
  deaconNames?: string[] | null;
}

interface Props {
  churches: LocalChurchDto[];
}

export function ChurchesView({ churches }: Props) {
  const [parishFilter, setParishFilter] = useState<string>("");
  const [query, setQuery] = useState<string>("");

  const parishes = useMemo(() => {
    const set = new Set<string>();
    for (const c of churches) {
      if (c.parishName) set.add(c.parishName);
    }
    return Array.from(set).sort();
  }, [churches]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return churches.filter((c) => {
      if (parishFilter && c.parishName !== parishFilter) return false;
      if (!q) return true;
      return (
        c.localChurchName.toLowerCase().includes(q) ||
        (c.localChurchCode ?? "").toLowerCase().includes(q) ||
        (c.address ?? "").toLowerCase().includes(q) ||
        (c.inChargePastorName ?? "").toLowerCase().includes(q)
      );
    });
  }, [churches, parishFilter, query]);

  // Group filtered by Diocese → Parish.
  const grouped = useMemo(() => {
    const byDiocese = new Map<string, Map<string, LocalChurchDto[]>>();
    for (const c of filtered) {
      const dio = c.dioceseName ?? "Unassigned";
      const par = c.parishName ?? "Unassigned";
      if (!byDiocese.has(dio)) byDiocese.set(dio, new Map());
      const dmap = byDiocese.get(dio)!;
      if (!dmap.has(par)) dmap.set(par, []);
      dmap.get(par)!.push(c);
    }
    return byDiocese;
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
            placeholder="Name, code, pastor, address…"
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </label>
        <label>
          <span className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
            Parish
          </span>
          <select
            value={parishFilter}
            onChange={(e) => setParishFilter(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">All parishes</option>
            {parishes.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        {(parishFilter || query) && (
          <button
            onClick={() => { setParishFilter(""); setQuery(""); }}
            className="text-sm text-red-700 hover:underline pb-2"
          >
            Clear
          </button>
        )}
        <span className="text-sm text-gray-600 pb-2 ml-auto">
          Showing <strong>{filtered.length}</strong> of {churches.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-gray-500">No Local Churches match those filters.</p>
      ) : (
        <div className="mt-8 space-y-10">
          {Array.from(grouped.entries()).map(([dioceseName, parishMap]) => (
            <section key={dioceseName}>
              <h2 className="text-xl font-bold text-red-900 border-b border-red-200 pb-1 mb-4">
                {dioceseName === "Unassigned"
                  ? "Diocese (unassigned)"
                  : `${dioceseName.replace(/\s+Diocese$/i, "")} Diocese`}
              </h2>
              <div className="space-y-6">
                {Array.from(parishMap.entries())
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([parishName, parishChurches]) => (
                    <div key={parishName}>
                      <h3 className="text-sm uppercase tracking-widest text-gray-500 mb-3">
                        {parishName === "Unassigned"
                          ? "Parish (unassigned)"
                          : `${parishName.replace(/\s+Parish$/i, "")} Parish`}
                        <span className="text-gray-400 normal-case tracking-normal ml-2">
                          · {parishChurches.length}
                        </span>
                      </h3>
                      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {parishChurches.map((c) => (
                          <li key={c.localChurchId}>
                            <Link
                              href={`/lc/${c.localChurchId}`}
                              className="block border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-red-300 transition"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="font-semibold text-lg">{c.localChurchName}</h4>
                                <span className="text-xs font-mono bg-yellow-100 text-yellow-900 px-2 py-1 rounded shrink-0">
                                  {c.localChurchCode}
                                </span>
                              </div>
                              {c.address && (
                                <p className="mt-2 text-sm text-gray-700">{c.address}</p>
                              )}
                              {c.inChargePastorName && (
                                <p className="mt-3 text-sm">
                                  <span className="text-gray-500">Pastor: </span>
                                  <span className="font-medium">{c.inChargePastorName}</span>
                                </p>
                              )}
                              {/* Replaces the old green "Active" badge with the deacon /
                                  church-leader names at this LC — a more useful local signal. */}
                              {(() => {
                                const deacons = c.deaconNames ?? [];
                                if (deacons.length === 0) {
                                  return (
                                    <p className="mt-2 text-xs text-gray-400 italic">No deacon yet</p>
                                  );
                                }
                                const label = deacons.length === 1 ? "Deacon" : "Deacons";
                                return (
                                  <p className="mt-2 text-xs text-gray-700">
                                    <span className="font-semibold text-gray-900">{label}:</span>{" "}
                                    {deacons.join(", ")}
                                  </p>
                                );
                              })()}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
