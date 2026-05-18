"use client";

// Parish dashboard. Phase 6 of the groups + five-tier RBAC redesign — spec
// docs/superpowers/specs/2026-05-18-groups-three-tier-design.md. Mirrors
// /diocese/[id] but parish-scoped: reuses the existing CessMatrix and
// KpiCards components, adds a parish-specific hero + Parish Groups list
// + LC mini-grid + parish leadership read-only block.
//
// Section gating (per spec Q4): the cess matrix + Bishop's calendar
// button render ONLY for the admin tier — group leaders must NOT see
// them. We read the gate off `session.profile.roleLabel.tier` (matches
// the existing useCanManage* permission hooks).

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";
import { RoleTier } from "@/auth";
import { CessMatrix } from "@/app/diocese/[id]/CessMatrix";
import { KpiCards } from "@/app/diocese/[id]/KpiCards";
import { ParishHero } from "./ParishHero";
import {
  BishopCalendarButton,
  LcMiniGrid,
  ParishEventsStrip,
  ParishGroupsSection,
  ParishLeadershipSection,
  type EventDto,
} from "./Sections";
import type { ParishOverview } from "./types";
import { toDioceseLc } from "./types";

// ---- skeleton helpers ----

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`bg-gray-200 animate-pulse rounded ${className}`} />;
}

function PageSkeleton() {
  return (
    <div>
      <header className="bg-gradient-to-br from-red-800 to-red-900 py-8">
        <div className="container mx-auto px-6 flex gap-6 items-center">
          <div className="flex-1 space-y-3">
            <SkeletonBlock className="h-4 w-48 bg-white/30" />
            <SkeletonBlock className="h-10 w-72 bg-white/40" />
            <SkeletonBlock className="h-3 w-96 bg-white/20" />
          </div>
          <SkeletonBlock className="h-24 w-64 bg-white/20" />
        </div>
      </header>
      <main className="container mx-auto px-6 py-6 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24" />
          ))}
        </div>
        <SkeletonBlock className="h-64" />
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-40" />
      </main>
    </div>
  );
}

// settled(): Promise.allSettled helper that returns the resolved value
// or `fallback` when the promise rejected. Same pattern as the diocese
// dashboard so per-section failures don't bring down the whole page.
function settled<T>(r: PromiseSettledResult<T>, fallback: T): T {
  return r.status === "fulfilled" ? r.value : fallback;
}

export default function ParishOverviewPage() {
  const params = useParams<{ id: string }>();
  const parishId = Number(params?.id);
  const { data: session, status: sessionStatus } = useSession();
  const token = session?.accessToken;

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<ParishOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventDto[]>([]);

  // Track the latest in-flight load so out-of-order refreshes never
  // overwrite newer data with older. Same guard as the diocese page.
  const loadIdRef = useRef(0);

  const loadAll = useCallback(async () => {
    if (!parishId || !token) return;

    const myLoadId = ++loadIdRef.current;
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";

    setLoading(true);

    const overviewP = apiFetch<ParishOverview>(
      `/Parish/${parishId}/overview`,
      token,
    );
    // Events are public and best-effort; parish filtering happens
    // client-side against the LC names in the overview payload.
    const eventsP = fetch(`${base}/public/events`).then((r) =>
      r.ok ? (r.json() as Promise<EventDto[]>) : Promise.reject(),
    );

    const [overviewR, eventsR] = await Promise.allSettled([
      overviewP,
      eventsP,
    ]);

    if (myLoadId !== loadIdRef.current) return;

    if (overviewR.status === "rejected") {
      setOverviewError(
        overviewR.reason instanceof Error
          ? overviewR.reason.message
          : "Could not load parish overview.",
      );
    } else {
      setOverviewError(null);
      setOverview(overviewR.value);
    }
    setEvents(settled<EventDto[]>(eventsR, []));

    setLoading(false);
  }, [parishId, token]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!parishId) return;
    if (!token) {
      setLoading(false);
      return;
    }
    void loadAll();
    const ref = loadIdRef;
    return () => {
      ref.current++;
    };
  }, [parishId, token, sessionStatus, loadAll]);

  if (sessionStatus === "loading" || (loading && !overview && !overviewError)) {
    return <PageSkeleton />;
  }

  if (sessionStatus !== "authenticated") {
    return (
      <div className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-red-900">Sign in required</h1>
        <p className="mt-3 text-gray-600">
          The parish dashboard is for signed-in users.
        </p>
      </div>
    );
  }

  if (overviewError && !overview) {
    const isForbidden = /forbidden/i.test(overviewError);
    return (
      <div className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-red-900">
          {isForbidden
            ? "You don't have access to this parish"
            : "Couldn't load the parish"}
        </h1>
        <p className="mt-3 text-gray-600">
          {isForbidden
            ? "Ask a diocesan admin to add you to this parish's roster."
            : overviewError}
        </p>
        <Link
          href="/"
          className="mt-6 inline-block bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded"
        >
          Back home
        </Link>
      </div>
    );
  }

  if (!overview) return <PageSkeleton />;

  // ---- gating ----
  //
  // Cess matrix + Bishop's calendar render only for admin-tier viewers
  // (Bishop or above). Group leaders / lower tiers fall below the
  // threshold so the matrix is HIDDEN — matches the spec's Q4 ruling.
  const tier = session?.profile?.roleLabel?.tier ?? RoleTier.Unverified;
  const isAdminTier = tier >= RoleTier.Bishop;

  // ---- derived data ----

  const memberCount = overview.localChurches.reduce(
    (a, l) => a + l.memberCount,
    0,
  );
  const officialsVerified = overview.localChurches.reduce(
    (a, l) => a + l.officialsVerified,
    0,
  );
  const officialsPending = overview.localChurches.reduce(
    (a, l) => a + l.officialsPending,
    0,
  );

  // Cess this month — same bucket counts as the diocese dashboard.
  const currentMonth = new Date().getMonth() + 1;
  let cessVerifiedThisMonth = 0;
  let cessSubmittedThisMonth = 0;
  let cessMissingThisMonth = 0;
  for (const lc of overview.localChurches) {
    const m = lc.cessThisYear.find((x) => x.periodMonth === currentMonth);
    const status = m?.status ?? "Missing";
    if (status === "Verified") cessVerifiedThisMonth++;
    else if (status === "Submitted") cessSubmittedThisMonth++;
    else cessMissingThisMonth++;
  }
  const cessTotalThisMonth =
    cessVerifiedThisMonth + cessSubmittedThisMonth + cessMissingThisMonth;

  // Pre-stamp parishName onto every LC so the reused CessMatrix renders
  // its parish header row with our parish's name. The matrix's grouping
  // collapses to a single section since every row shares one parish.
  const matrixLcs = overview.localChurches.map((lc) =>
    toDioceseLc(lc, overview.parishName),
  );

  const lcNames = new Set(
    overview.localChurches.map((l) => l.localChurchName),
  );

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50">
      <ParishHero
        parishId={overview.parishId}
        parishName={overview.parishName}
        dioceseId={overview.dioceseId}
        dioceseName={overview.dioceseName}
        inChargePastor={overview.inChargePastor}
      />

      <main className="container mx-auto px-6 py-8 space-y-10">
        <KpiCards
          localChurchCount={overview.localChurches.length}
          parishCount={1}
          memberCount={memberCount}
          activeClergyCount={overview.inChargePastor ? 1 : 0}
          officialsVerified={officialsVerified}
          officialsPending={officialsPending}
          cessVerifiedThisMonth={cessVerifiedThisMonth}
          cessSubmittedThisMonth={cessSubmittedThisMonth}
          cessTotalThisMonth={cessTotalThisMonth}
        />

        {/* Cess matrix — admin tier only per spec Q4. Group leaders never
            see this section. */}
        {isAdminTier && <CessMatrix localChurches={matrixLcs} />}

        <ParishLeadershipSection pastor={overview.inChargePastor} />

        <ParishGroupsSection groups={overview.groups} />

        <LcMiniGrid localChurches={overview.localChurches} />

        <ParishEventsStrip events={events} lcNames={lcNames} />

        {/* Bishop's calendar — admins only. Group leaders + lower tiers
            don't see the button at all. */}
        {isAdminTier && (
          <BishopCalendarButton dioceseId={overview.dioceseId} />
        )}
      </main>

      <footer className="bg-gray-900 text-gray-300 py-6 text-center mt-12 space-y-1">
        <p className="text-sm">
          © {year} {overview.parishName}
          {overview.dioceseName ? ` · ${overview.dioceseName}` : ""}
        </p>
        <p className="text-[10px] text-gray-500 tracking-wide">
          Made with <span aria-hidden>❤️</span>
          <span className="sr-only">love</span> by Pawad Technologies ltd
        </p>
      </footer>
    </div>
  );
}
