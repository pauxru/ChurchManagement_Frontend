"use client";

// Smaller dashboard sections for /diocese/[id]: bishops list, clergy
// distribution bar, parish mini-grid, upcoming events strip, recent
// transfers. Each component takes already-fetched data and is pure
// presentation — the page owns all the data wiring.

import Link from "next/link";
import { clergyDisplayName, rankGradient } from "@/lib/clergyDisplay";
import type {
  BishopRow,
  ClergyApiRow,
  ClergyPublic,
  EventDto,
  Lc,
  ParishRow,
  TransferDto,
} from "./types";
import { initials, RANK_NAME } from "./types";

// ===== Bishops list =====

interface BishopsListProps {
  bishops: BishopRow[];
  inChargeId: number | null;
  publicById: Map<number, ClergyPublic>;
}

export function BishopsList({ bishops, inChargeId, publicById }: BishopsListProps) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 pb-2 mb-4">
        Bishops
      </h2>
      {bishops.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No bishops appointed yet.</p>
      ) : (
        <ul className="space-y-3">
          {bishops.map((b) => {
            const pub = publicById.get(b.clergyID);
            const display = clergyDisplayName(
              b.clergyName,
              pub?.rankLabel ?? "Bishop",
              pub?.salutation ?? "Rt Rev",
            );
            const isInCharge = b.clergyID === inChargeId || b.isInCharge;
            const photo = pub?.photoUrl;
            const grad = rankGradient(pub?.rankLabel ?? "Bishop");
            return (
              <li
                key={b.clergyID}
                className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2"
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo}
                    alt={b.clergyName}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow"
                  />
                ) : (
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold ring-2 ring-white shadow`}
                  >
                    {initials(b.clergyName)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 truncate">{display}</div>
                  <div className="text-xs text-gray-500">
                    Ordained {b.ordinationDate?.slice(0, 4) ?? "—"}
                  </div>
                </div>
                {isInCharge && (
                  <span className="bg-yellow-100 text-yellow-900 text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded">
                    In-charge
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ===== Clergy distribution bar =====

interface ClergyDistProps {
  clergy: ClergyApiRow[]; // every active clergy in the diocese
}

const RANKS_TO_SHOW: string[] = [
  "ArchDeacon",
  "Pastor",
  "Deacon",
  "ChurchLeader",
  "Evangelist",
];

const RANK_DISPLAY: Record<string, string> = {
  ArchDeacon: "Archdeacons",
  Pastor: "Pastors",
  Deacon: "Deacons",
  ChurchLeader: "Church Leaders",
  Evangelist: "Evangelists",
};

// Tailwind-safe colour tokens. The gradient classes in clergyColors.ts
// are great for circles, but for an inline bar we want solid fills so
// the legend reads cleanly. Pick a representative solid that matches
// each rank's hue.
const RANK_SOLID: Record<string, string> = {
  ArchDeacon: "bg-yellow-500",
  Pastor: "bg-[#73c2fb]",
  Deacon: "bg-gray-800",
  ChurchLeader: "bg-gray-600",
  Evangelist: "bg-purple-500",
};

export function ClergyDistribution({ clergy }: ClergyDistProps) {
  const counts: Record<string, number> = Object.fromEntries(
    RANKS_TO_SHOW.map((r) => [r, 0]),
  );
  for (const c of clergy) {
    if (!c.isActive) continue;
    const name = RANK_NAME[c.clergyRank];
    if (name && counts[name] !== undefined) counts[name] += 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 pb-2 mb-4">
        Clergy by rank
      </h2>
      {total === 0 ? (
        <p className="text-sm text-gray-400 italic">No clergy on record yet.</p>
      ) : (
        <>
          {/* Stacked horizontal bar */}
          <div className="w-full h-6 rounded-full overflow-hidden flex bg-gray-100 ring-1 ring-gray-200">
            {RANKS_TO_SHOW.map((r) => {
              const v = counts[r];
              if (v === 0) return null;
              const pct = (v / total) * 100;
              return (
                <div
                  key={r}
                  className={`${RANK_SOLID[r]} h-full`}
                  style={{ width: `${pct}%` }}
                  title={`${RANK_DISPLAY[r]}: ${v}`}
                />
              );
            })}
          </div>
          {/* Legend / counts */}
          <ul className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            {RANKS_TO_SHOW.map((r) => (
              <li key={r} className="flex items-center gap-2">
                <span className={`inline-block w-3 h-3 rounded ${RANK_SOLID[r]}`} />
                <span className="text-gray-700">{RANK_DISPLAY[r]}</span>
                <span className="ml-auto font-bold text-gray-900">{counts[r]}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 col-span-full border-t border-gray-200 pt-2 mt-1">
              <span className="text-gray-500 text-xs uppercase tracking-wide">Total active</span>
              <span className="ml-auto font-bold text-red-900">{total}</span>
            </li>
          </ul>
        </>
      )}
    </section>
  );
}

// ===== Parish mini-grid =====

interface ParishGridProps {
  parishes: ParishRow[];
  localChurches: Lc[];
  parishClergyByParishId: Map<number, ClergyApiRow[]>;
  publicById: Map<number, ClergyPublic>;
}

export function ParishGrid({
  parishes,
  localChurches,
  parishClergyByParishId,
  publicById,
}: ParishGridProps) {
  // Group LCs by parish name (the overview payload only gives names,
  // not parishIds — but parish names within a diocese are unique enough
  // for this aggregate).
  const lcsByParishName = new Map<string, Lc[]>();
  for (const lc of localChurches) {
    const list = lcsByParishName.get(lc.parishName) ?? [];
    list.push(lc);
    lcsByParishName.set(lc.parishName, list);
  }

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 pb-2 mb-4">
        Parishes
      </h2>
      {parishes.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No parishes yet.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {parishes.map((p) => {
            const lcs = lcsByParishName.get(p.parishName) ?? [];
            const memberTotal = lcs.reduce((a, l) => a + l.memberCount, 0);
            // In-charge pastor: lead Pastor at this parish, falling back
            // to first Pastor when none flagged in-charge.
            const parishClergy = parishClergyByParishId.get(p.parishId) ?? [];
            const pastors = parishClergy.filter(
              (c) => RANK_NAME[c.clergyRank] === "Pastor" && c.isActive,
            );
            const inCharge =
              pastors.find((c) => c.isInCharge) ?? pastors[0] ?? null;
            const inChargePub = inCharge
              ? publicById.get(inCharge.clergyID)
              : null;
            const inChargeDisplay = inCharge
              ? clergyDisplayName(
                  inCharge.clergyName,
                  inChargePub?.rankLabel ?? "Pastor",
                  inChargePub?.salutation ?? "Rev",
                )
              : null;
            return (
              <li key={p.parishId}>
                <Link
                  href={`/churches?parish=${p.parishId}`}
                  className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-red-300 hover:shadow-md transition h-full"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-red-900 truncate">
                      {p.parishName.replace(/\s+Parish$/i, "")} Parish
                    </h3>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-semibold whitespace-nowrap">
                      {lcs.length} LC{lcs.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-700">
                    {memberTotal === 0 ? (
                      <span className="text-gray-400 italic">No members yet</span>
                    ) : (
                      <>
                        <span className="font-semibold">
                          {memberTotal.toLocaleString()}
                        </span>{" "}
                        members
                      </>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {inChargeDisplay ? (
                      <>
                        <span className="text-gray-400">In-charge: </span>
                        <span className="text-gray-800 font-medium">
                          {inChargeDisplay}
                        </span>
                      </>
                    ) : (
                      <span className="italic">No in-charge pastor yet</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ===== Upcoming events strip =====

interface EventsProps {
  events: EventDto[];
  lcNames: Set<string>;
}

function formatEventDate(iso: string): { day: string; month: string } {
  const d = new Date(iso + "T00:00:00Z");
  return {
    day: String(d.getUTCDate()),
    month: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
  };
}

export function EventsStrip({ events, lcNames }: EventsProps) {
  // Prefer events that land at an LC in this diocese; if none match, fall
  // back to the first six events system-wide so the strip isn't empty for
  // dioceses whose LCs haven't started using the events feature.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const future = events.filter((e) => {
    const d = new Date(e.eventStartDate + "T00:00:00Z");
    return d.getTime() >= today.getTime();
  });
  const localMatches = future.filter((e) =>
    Array.from(lcNames).some((n) =>
      e.eventLocationChurch?.toLowerCase().includes(n.toLowerCase()),
    ),
  );
  const list = (localMatches.length > 0 ? localMatches : future).slice(0, 6);

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 pb-2 mb-4">
        Upcoming events
      </h2>
      {list.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No upcoming events.</p>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <ul className="flex gap-3 px-2 pb-2">
            {list.map((e) => {
              const { day, month } = formatEventDate(e.eventStartDate);
              return (
                <li key={e.eventId} className="shrink-0 w-64">
                  <div className="bg-white border border-gray-200 rounded-xl p-3 h-full hover:shadow-md transition">
                    <div className="flex items-start gap-3">
                      <div className="w-14 text-center bg-red-50 text-red-900 rounded p-2 shrink-0">
                        <div className="text-2xl font-bold leading-none">{day}</div>
                        <div className="text-[10px] uppercase tracking-wide">{month}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">
                          {e.eventTitle}
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5 truncate">
                          {e.eventLocationChurch}
                        </p>
                        {e.eventTheme && (
                          <p className="text-xs italic text-gray-500 mt-1 line-clamp-2">
                            {e.eventTheme}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

// ===== Recent transfers =====

interface TransfersProps {
  transfers: TransferDto[];
  dioceseId: number;
}

const STATUS_PILL: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-900",
  Scheduled: "bg-blue-100 text-blue-900",
  Applied: "bg-green-100 text-green-900",
  Cancelled: "bg-gray-200 text-gray-700",
  Rejected: "bg-red-100 text-red-900",
};

export function RecentTransfers({ transfers, dioceseId }: TransfersProps) {
  // Sort by initiated date, newest first. Take 5.
  const latest = [...transfers]
    .sort((a, b) =>
      (b.initiatedAt ?? "").localeCompare(a.initiatedAt ?? ""),
    )
    .slice(0, 5);

  return (
    <section>
      <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Recent transfers
        </h2>
        <Link
          href={`/diocese/${dioceseId}/transfers`}
          className="text-xs text-red-700 hover:underline font-semibold"
        >
          View all →
        </Link>
      </div>
      {latest.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No transfers yet.</p>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
          {latest.map((t) => (
            <li
              key={t.id}
              className="px-4 py-3 flex items-center gap-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-gray-900 truncate">
                  {t.clergyName ?? `Clergy #${t.clergyId}`}
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  {t.fromLevel} #{t.fromLevelID} ({t.fromRank}) →{" "}
                  {t.toLevel} #{t.toLevelID} ({t.toRank})
                </div>
              </div>
              <div className="text-xs text-gray-500 shrink-0 hidden sm:block">
                {t.effectiveDate}
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded ${
                  STATUS_PILL[t.status] ?? "bg-gray-100 text-gray-700"
                }`}
              >
                {t.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
