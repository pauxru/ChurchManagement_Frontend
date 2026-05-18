"use client";

// Smaller dashboard sections specific to the Parish workspace: parish-tier
// groups list, parish leadership read-only block, LC mini-grid scoped to
// this parish, upcoming events filtered by LC name, and a button that
// links to the Bishop's calendar (which still lives at /diocese/{id} for
// v1 — admins only). See spec
// docs/superpowers/specs/2026-05-18-groups-three-tier-design.md Phase 6.

import Link from "next/link";
import type { InChargePastor, ParishGroup, ParishLc } from "./types";

// ===== Parish Groups list =====

interface GroupsProps {
  groups: ParishGroup[];
}

export function ParishGroupsSection({ groups }: GroupsProps) {
  return (
    <section>
      <div className="flex items-baseline justify-between border-b border-gray-200 pb-2 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Parish groups
        </h2>
        <span className="text-xs text-gray-400">{groups.length} active</span>
      </div>
      {groups.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          No parish-tier groups yet. They&apos;ll appear here once an admin
          creates them.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map((g) => (
            <li key={g.groupId}>
              <Link
                href={`/group/${g.groupId}`}
                className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-red-300 hover:shadow-md transition h-full"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-red-900 truncate">{g.name}</h3>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-semibold whitespace-nowrap">
                    {g.memberCount} member{g.memberCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {g.leaderName ? (
                    <>
                      <span className="text-gray-400">Lead by </span>
                      <span className="text-gray-800 font-medium">
                        {g.leaderName}
                      </span>
                    </>
                  ) : (
                    <span className="italic">No leader assigned yet</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ===== Parish Leadership (read-only) =====

interface LeadershipProps {
  pastor: InChargePastor | null;
}

export function ParishLeadershipSection({ pastor }: LeadershipProps) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 pb-2 mb-4">
        Parish leadership
      </h2>
      {pastor == null ? (
        <p className="text-sm text-gray-400 italic">
          No in-charge Pastor assigned yet.
        </p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
          {pastor.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pastor.photoUrl}
              alt={pastor.clergyName}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-white shadow"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center text-white text-lg font-bold ring-2 ring-white shadow">
              {pastor.clergyName
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900 truncate">
              {pastor.clergyName}
            </div>
            <div className="text-xs text-gray-500">In-charge Pastor</div>
          </div>
        </div>
      )}
      <p className="mt-3 text-xs text-gray-500 italic">
        Read-only view. Edits happen through{" "}
        <Link href="/admin/clergy" className="text-red-700 hover:underline">
          /admin/clergy
        </Link>
        .
      </p>
    </section>
  );
}

// ===== LC mini-grid =====

interface LcGridProps {
  localChurches: ParishLc[];
}

export function LcMiniGrid({ localChurches }: LcGridProps) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 pb-2 mb-4">
        Local churches
      </h2>
      {localChurches.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          No local churches in this parish yet.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {localChurches.map((lc) => {
            const officialsTotal = lc.officialsVerified + lc.officialsPending;
            return (
              <li key={lc.localChurchId}>
                <Link
                  href={`/lc/${lc.localChurchId}`}
                  className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-red-300 hover:shadow-md transition h-full"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-red-900 truncate">
                      {lc.localChurchName}
                    </h3>
                    {lc.localChurchCode && (
                      <span className="text-[10px] tracking-wide uppercase bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                        {lc.localChurchCode}
                      </span>
                    )}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div className="flex items-baseline justify-between">
                      <dt className="text-gray-500">Members</dt>
                      <dd className="font-semibold text-gray-900 tabular-nums">
                        {lc.memberCount.toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <dt className="text-gray-500">Officials</dt>
                      <dd className="font-semibold text-gray-900 tabular-nums">
                        {officialsTotal}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <dt className="text-gray-500">Active plans</dt>
                      <dd className="font-semibold text-gray-900 tabular-nums">
                        {lc.activePlans}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <dt className="text-gray-500">Events</dt>
                      <dd className="font-semibold text-gray-900 tabular-nums">
                        {lc.upcomingEvents}
                      </dd>
                    </div>
                  </dl>
                  {lc.officialsPending > 0 && (
                    <p className="mt-2 text-[11px] text-yellow-700">
                      {lc.officialsPending} pending verification
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ===== Upcoming events strip (filtered to this parish's LC names) =====
//
// Same shape + filter strategy as the diocese dashboard — best-effort
// substring match against the event's `eventLocationChurch` free-text
// label. When no LC matches, render nothing rather than the diocese-wide
// fallback (the parish dashboard is supposed to feel parish-scoped).

interface EventDto {
  eventId: number;
  eventTitle: string;
  eventCategory: string | null;
  eventStartDate: string;
  eventStartTime: string;
  eventEndDate: string;
  eventEndTime: string;
  eventLocationChurch: string;
  eventTheme: string | null;
  eventDescription: string;
}

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

export function ParishEventsStrip({ events, lcNames }: EventsProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const future = events.filter((e) => {
    const d = new Date(e.eventStartDate + "T00:00:00Z");
    return d.getTime() >= today.getTime();
  });
  const list = future
    .filter((e) =>
      Array.from(lcNames).some((n) =>
        e.eventLocationChurch?.toLowerCase().includes(n.toLowerCase()),
      ),
    )
    .slice(0, 6);

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 pb-2 mb-4">
        Upcoming events in this parish
      </h2>
      {list.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          No upcoming events for this parish&apos;s local churches.
        </p>
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
                        <div className="text-2xl font-bold leading-none">
                          {day}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide">
                          {month}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">
                          {e.eventTitle}
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5 truncate">
                          {e.eventLocationChurch}
                        </p>
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

// ===== Bishop's calendar button (admins only — gated by caller) =====
//
// V1 simply links to the diocese dashboard where the BishopCalendar lives.
// The caller decides whether to render this at all (group leaders MUST NOT
// see it per the spec's Q4 answer).

interface BishopCalendarLinkProps {
  dioceseId: number;
}

export function BishopCalendarButton({ dioceseId }: BishopCalendarLinkProps) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 pb-2 mb-4">
        Bishop&apos;s calendar
      </h2>
      <Link
        href={`/diocese/${dioceseId}`}
        className="inline-flex items-center gap-2 bg-red-800 hover:bg-red-900 text-white font-semibold text-sm px-5 py-2.5 rounded shadow-sm transition"
      >
        View Bishop&apos;s calendar
        <span aria-hidden>→</span>
      </Link>
      <p className="mt-2 text-xs text-gray-500">
        Visits land on the diocese dashboard for v1.
      </p>
    </section>
  );
}

export type { EventDto };
