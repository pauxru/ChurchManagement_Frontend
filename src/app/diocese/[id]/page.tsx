"use client";

// Diocesan dashboard. Reworked from the original "Bishop overview" sparse
// roster into a full-width dashboard: hero strip with in-charge bishop +
// contact + quick actions, KPI cards, polished cess matrix, clergy
// distribution, parish mini-grid, upcoming events, recent transfers.
//
// Every fetch runs inside one useEffect via Promise.allSettled so a 403
// or 5xx on one endpoint only blanks its own section. The mandatory
// /Bishop/diocese/{id}/overview drives the hero + cess matrix + member /
// official roll-ups; everything else degrades silently.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";
import BishopCalendar from "@/components/BishopCalendar";
import { DioceseHero } from "./DioceseHero";
import { KpiCards } from "./KpiCards";
import { CessMatrix } from "./CessMatrix";
import {
  BishopsList,
  ClergyDistribution,
  EventsStrip,
  ParishGrid,
  RecentTransfers,
} from "./Sections";
import type {
  ClergyApiRow,
  ClergyPublic,
  DioceseSettings,
  EventDto,
  Overview,
  ParishRow,
  TransferDto,
} from "./types";
import { RANK_NAME } from "./types";

// Hard-coded fallback. We don't have a /public/archdiocese lookup yet —
// the rest of the codebase already pins "Nairobi Archdiocese" everywhere
// (Navbar, home page, footers), so mirror that until the API exposes a
// way to look up Diocese.ArchDioceseId → ArchDiocese.ArchDioceseName.
const FALLBACK_ARCHDIOCESE_NAME = "Nairobi";

// settled(): Promise.allSettled helper that returns the resolved value
// or `fallback` when the promise rejected. Keeps the unwrap noise out
// of the main fetch effect.
function settled<T>(r: PromiseSettledResult<T>, fallback: T): T {
  return r.status === "fulfilled" ? r.value : fallback;
}

// ----- skeleton helpers -----

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
        <div className="grid md:grid-cols-2 gap-6">
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-48" />
        </div>
        <SkeletonBlock className="h-40" />
      </main>
    </div>
  );
}

export default function DioceseOverviewPage() {
  const params = useParams<{ id: string }>();
  const dioceseId = Number(params?.id);
  const { data: session, status: sessionStatus } = useSession();
  const token = session?.accessToken;

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [parishes, setParishes] = useState<ParishRow[]>([]);
  const [dioceseClergy, setDioceseClergy] = useState<ClergyApiRow[]>([]);
  const [parishClergy, setParishClergy] = useState<Map<number, ClergyApiRow[]>>(
    new Map(),
  );
  const [lcClergy, setLcClergy] = useState<ClergyApiRow[]>([]);
  const [publicClergy, setPublicClergy] = useState<ClergyPublic[]>([]);
  const [settings, setSettings] = useState<DioceseSettings | null>(null);
  const [events, setEvents] = useState<EventDto[]>([]);
  const [transfers, setTransfers] = useState<TransferDto[]>([]);

  useEffect(() => {
    // Wait for next-auth to settle. Unauthenticated visitors get a
    // friendly sign-in CTA below; we don't kick off fetches that would
    // bounce to /signin.
    if (sessionStatus === "loading") return;
    if (!dioceseId) return;
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";

    (async () => {
      setLoading(true);

      // Phase 1: fetch everything that doesn't depend on the overview's
      // parish names. Run in parallel; degrade per-promise.
      const overviewP = apiFetch<Overview>(
        `/Bishop/diocese/${dioceseId}/overview`,
        token,
      );
      const parishesP = apiFetch<ParishRow[]>(
        `/Churches/diocese-parishes/${dioceseId}`,
        token,
      );
      const dioceseClergyP = apiFetch<ClergyApiRow[]>(
        `/Clergy/diocese/${dioceseId}`,
        token,
      );
      const settingsP = apiFetch<DioceseSettings>(
        `/Admin/diocese/${dioceseId}/settings`,
        token,
      );
      const transfersP = apiFetch<TransferDto[]>(
        `/Bishop/transfers?dioceseId=${dioceseId}`,
        token,
      );
      const publicClergyP = fetch(`${base}/public/clergy`).then((r) =>
        r.ok ? (r.json() as Promise<ClergyPublic[]>) : Promise.reject(),
      );
      const eventsP = fetch(`${base}/public/events`).then((r) =>
        r.ok ? (r.json() as Promise<EventDto[]>) : Promise.reject(),
      );

      const [
        overviewR,
        parishesR,
        dioceseClergyR,
        settingsR,
        transfersR,
        publicClergyR,
        eventsR,
      ] = await Promise.allSettled([
        overviewP,
        parishesP,
        dioceseClergyP,
        settingsP,
        transfersP,
        publicClergyP,
        eventsP,
      ]);

      if (cancelled) return;

      // Overview is the spine — surface its error if it failed. Other
      // sections live without it but we still need the page to know.
      if (overviewR.status === "rejected") {
        setOverviewError(
          overviewR.reason instanceof Error
            ? overviewR.reason.message
            : "Could not load diocese overview.",
        );
      } else {
        setOverview(overviewR.value);
      }
      const parishRows = settled<ParishRow[]>(parishesR, []);
      setParishes(parishRows);
      setDioceseClergy(settled<ClergyApiRow[]>(dioceseClergyR, []));
      setSettings(settled<DioceseSettings | null>(settingsR, null));
      setTransfers(settled<TransferDto[]>(transfersR, []));
      setPublicClergy(settled<ClergyPublic[]>(publicClergyR, []));
      setEvents(settled<EventDto[]>(eventsR, []));

      // Phase 2: parish + LC clergy walks. These give us the in-charge
      // pastor per parish (parish-grid) and contribute to the clergy
      // distribution count. Same pattern the transfers Board uses.
      // Many requests, low priority — fire after the main paint.
      const overviewVal = overviewR.status === "fulfilled" ? overviewR.value : null;
      const lcIds = overviewVal?.localChurches.map((l) => l.localChurchId) ?? [];

      const parishClergyResults = await Promise.allSettled(
        parishRows.map((p) =>
          apiFetch<ClergyApiRow[]>(`/Clergy/parish/${p.parishId}`, token),
        ),
      );
      const lcClergyResults = await Promise.allSettled(
        lcIds.map((id) =>
          apiFetch<ClergyApiRow[]>(`/Clergy/localChurch/${id}`, token),
        ),
      );

      if (cancelled) return;

      const parishMap = new Map<number, ClergyApiRow[]>();
      parishRows.forEach((p, idx) => {
        const r = parishClergyResults[idx];
        parishMap.set(p.parishId, settled<ClergyApiRow[]>(r, []));
      });
      setParishClergy(parishMap);

      const lcRows: ClergyApiRow[] = [];
      lcClergyResults.forEach((r) => {
        if (r.status === "fulfilled") lcRows.push(...r.value);
      });
      setLcClergy(lcRows);

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [dioceseId, token, sessionStatus]);

  if (sessionStatus === "loading" || (loading && !overview && !overviewError)) {
    return <PageSkeleton />;
  }

  if (sessionStatus !== "authenticated") {
    return (
      <div className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-red-900">Sign in required</h1>
        <p className="mt-3 text-gray-600">
          The diocese dashboard is for signed-in users.
        </p>
      </div>
    );
  }

  if (overviewError && !overview) {
    return (
      <div className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-red-900">
          Couldn&apos;t load the diocese
        </h1>
        <p className="mt-3 text-gray-600">{overviewError}</p>
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

  // ---- derived data ----

  const inChargeId =
    overview.inChargeBishopClergyId ??
    (overview.bishops.length === 1 ? overview.bishops[0].clergyID : null);
  const inChargeBishop =
    overview.bishops.find((b) => b.clergyID === inChargeId) ?? null;

  const publicById = new Map(publicClergy.map((c) => [c.clergyId, c]));
  const inChargeBishopPublic = inChargeId ? publicById.get(inChargeId) ?? null : null;

  // KPIs
  const localChurchCount = overview.localChurches.length;
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

  // Cess this month — count buckets across LCs.
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

  // Active clergy across the diocese: diocese-level rows + per-parish + per-LC.
  const allClergyById = new Map<number, ClergyApiRow>();
  for (const c of dioceseClergy) {
    if (c.isActive) allClergyById.set(c.clergyID, c);
  }
  for (const list of parishClergy.values()) {
    for (const c of list) {
      if (c.isActive) allClergyById.set(c.clergyID, c);
    }
  }
  for (const c of lcClergy) {
    if (c.isActive) allClergyById.set(c.clergyID, c);
  }
  const allClergy = Array.from(allClergyById.values());
  // Exclude ranks above Bishop (the Archbishop floor doesn't sit inside
  // a diocese). Bishops count toward the headline number though.
  const activeClergyCount = allClergy.filter((c) => {
    const name = RANK_NAME[c.clergyRank];
    return (
      name === "Bishop" ||
      name === "ArchDeacon" ||
      name === "Pastor" ||
      name === "Deacon" ||
      name === "ChurchLeader" ||
      name === "Evangelist"
    );
  }).length;

  // LC names — used to filter events to this diocese (best-effort match
  // on eventLocationChurch which is a free-text label).
  const lcNames = new Set(overview.localChurches.map((l) => l.localChurchName));

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50">
      <DioceseHero
        dioceseId={overview.dioceseId}
        dioceseName={overview.dioceseName}
        archdioceseName={FALLBACK_ARCHDIOCESE_NAME}
        inChargeBishop={inChargeBishop}
        inChargeBishopPublic={inChargeBishopPublic}
        settings={settings}
      />

      <main className="container mx-auto px-6 py-8 space-y-10">
        <KpiCards
          localChurchCount={localChurchCount}
          parishCount={parishes.length > 0 ? parishes.length : null}
          memberCount={memberCount}
          activeClergyCount={allClergy.length > 0 ? activeClergyCount : null}
          officialsVerified={officialsVerified}
          officialsPending={officialsPending}
          cessVerifiedThisMonth={cessVerifiedThisMonth}
          cessSubmittedThisMonth={cessSubmittedThisMonth}
          cessTotalThisMonth={cessTotalThisMonth}
        />

        <CessMatrix localChurches={overview.localChurches} />

        <div className="grid lg:grid-cols-2 gap-6">
          <BishopsList
            bishops={overview.bishops}
            inChargeId={inChargeId}
            publicById={publicById}
          />
          <ClergyDistribution clergy={allClergy} />
        </div>

        <BishopCalendar dioceseId={overview.dioceseId} />

        <ParishGrid
          parishes={parishes}
          localChurches={overview.localChurches}
          parishClergyByParishId={parishClergy}
          publicById={publicById}
        />

        <EventsStrip events={events} lcNames={lcNames} />

        <RecentTransfers transfers={transfers} dioceseId={overview.dioceseId} />
      </main>

      <footer className="bg-gray-900 text-gray-300 py-6 text-center mt-12 space-y-1">
        <p className="text-sm">
          © {year} {overview.dioceseName} · AIPCA {FALLBACK_ARCHDIOCESE_NAME}{" "}
          Archdiocese
        </p>
        <p className="text-[10px] text-gray-500 tracking-wide">
          Made with <span aria-hidden>❤️</span>
          <span className="sr-only">love</span> by Pawad Technologies ltd
        </p>
      </footer>
    </div>
  );
}
