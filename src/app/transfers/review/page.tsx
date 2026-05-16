"use client";

// Page 3 of the transfers wizard — the bishop reviews every staged move,
// picks an effective date / Apply-immediately / CC list, and submits.
//
// The page composes an "effective" view of the diocese by merging the
// canonical clergy assignments with the draft arrays held in the wizard
// context. Each clergy is rendered exactly once at their effective slot
// with a status pill (stayed / moved / in-charge changed) so the bishop
// sees the full picture in one foldable tree before signing off.
//
// See docs/superpowers/specs/2026-05-16-transfers-wizard-design.md
// (Frontend → Page 3) for the spec.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";
import { SALUTATION_BY_RANK, clergyDisplayName } from "@/lib/clergyDisplay";
import { rankChip } from "@/lib/clergyColors";
import {
  useWizard,
  type Level,
  type TransferDraft,
} from "../wizard-context";

// Mirror C# enums (see Page 1 / Page 2 for the same maps).
const RANK_NAMES: Record<number, string> = {
  1: "Evangelist",
  2: "ChurchLeader",
  3: "Deacon",
  4: "Pastor",
  5: "ArchDeacon",
  6: "Bishop",
  7: "ArchBishop",
  8: "PresidingArchbishop",
};

const LEVEL_NAMES: Record<number, string> = {
  1: "LocalChurch",
  2: "Parish",
  3: "Diocese",
  4: "ArchDiocese",
  5: "National",
};

// Ranks that this wizard moves around — bishops are read-only here, and
// Evangelists are excluded per spec.
const PASTOR_RANKS: ReadonlySet<string> = new Set(["Pastor", "ArchDeacon"]);
const LC_RANKS: ReadonlySet<string> = new Set(["Deacon", "ChurchLeader"]);

interface ClergyApiRow {
  clergyID: number;
  clergyName: string;
  clergyRank: number;
  level: number;
  levelID: number;
  isInCharge: boolean;
  isActive: boolean;
  photoUrl: string | null;
  ordinationDate: string | null;
}

interface ParishRow {
  parishId: number;
  parishName: string;
  dioceseID: number;
}

interface LcRow {
  localChurchId: number;
  localChurchName: string;
  localChurchCode: string | null;
  localChurchParishID: number;
}

interface DioceseSettings {
  dioceseId: number;
  dioceseName: string;
  defaultLetterCc?: string | null;
}

interface DioceseOverview {
  dioceseId: number;
  dioceseName: string;
  bishops: Array<{
    clergyID: number;
    clergyName: string;
    ordinationDate: string | null;
    isInCharge: boolean;
  }>;
}

// Effective view of one clergy after merging drafts. Drives the row
// rendering decisions: which slot they sit in, whether the row should be
// emerald / amber, and the sub-line ("moved from X").
interface EffectiveClergy {
  clergyId: number;
  name: string;
  rankLabel: string;
  salutation: string;
  ordinationDate: string | null;
  // Canonical (current DB) position.
  canonicalLevel: Level | null;
  canonicalLevelId: number | null;
  canonicalIsInCharge: boolean;
  // Effective (post-submit) position.
  effectiveLevel: Level;
  effectiveLevelId: number;
  effectiveIsInCharge: boolean;
  // Derived status — drives the outline + pill.
  status: "stayed" | "moved" | "in-charge-changed";
}

// Submit result shape from /Bishop/transfers/batch-confirm.
interface BatchResult {
  batchId: string;
  applied: number;
  scheduled: number;
  skipped: { clergyId: number; reason: string }[];
}

// --- helpers ---

// Today as ISO yyyy-MM-dd in the user's local timezone — good enough for a
// human-picked effective date. Used both as the date picker minimum and
// the placeholder label when "Apply immediately" is checked.
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function locationLabel(
  level: Level | null,
  levelId: number | null,
  parishesById: Map<number, string>,
  lcsById: Map<number, string>,
  dioceseName: string,
): string {
  if (level === null || levelId === null) return "—";
  if (level === "Diocese") return dioceseName;
  if (level === "Parish") return parishesById.get(levelId) ?? `Parish ${levelId}`;
  if (level === "LocalChurch") return lcsById.get(levelId) ?? `LC ${levelId}`;
  return "—";
}

// Pretty-print the skipped-clergy entries returned by batch-confirm so
// the toast can list each skip rather than just the count.
function describeSkip(
  s: { clergyId: number; reason: string },
  nameById: Map<number, string>,
): string {
  const who = nameById.get(s.clergyId) ?? `Clergy ${s.clergyId}`;
  return `${who} — ${s.reason}`;
}

// --- main page ---

export default function TransfersReviewPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const token = session?.accessToken;
  const {
    dioceseId,
    pastorDrafts,
    lcDrafts,
    effectiveDate,
    applyImmediately,
    ccList,
    setReview,
    error: wizardError,
    loading: wizardLoading,
  } = useWizard();

  const [overview, setOverview] = useState<DioceseOverview | null>(null);
  const [parishes, setParishes] = useState<ParishRow[]>([]);
  const [lcs, setLcs] = useState<LcRow[]>([]);
  // Raw canonical clergy across the whole diocese, keyed by id so the
  // tree composer can look up name / rank / ordination without re-fetching.
  const [canonicalById, setCanonicalById] = useState<Map<number, ClergyApiRow>>(new Map());
  const [loadingPage, setLoadingPage] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Submit state.
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [redirectIn, setRedirectIn] = useState<number | null>(null);

  // Tree expand / collapse state. Keyed strings ("parish-12", "lc-44") so
  // we can store both kinds in one set.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Track whether we've already done the one-time CC pre-fill so we don't
  // overwrite user edits on subsequent renders.
  const [ccPrefilled, setCcPrefilled] = useState(false);

  // --- data load ---

  const reload = useCallback(async () => {
    if (!token) return;
    setLoadingPage(true);
    setPageError(null);
    try {
      const [ov, parishRows, lcRows, dioceseClergy] = await Promise.all([
        apiFetch<DioceseOverview>(`/Bishop/diocese/${dioceseId}/overview`, token),
        apiFetch<ParishRow[]>(`/Churches/diocese-parishes/${dioceseId}`, token),
        apiFetch<LcRow[]>(`/Churches/diocese/${dioceseId}`, token),
        apiFetch<ClergyApiRow[]>(`/Clergy/diocese/${dioceseId}`, token),
      ]);

      // For each parish, fetch its current clergy. Same shape as Page 1.
      // For each LC, fetch its current clergy (Deacons + CLs).
      const [parishLists, lcLists] = await Promise.all([
        Promise.all(parishRows.map((p) =>
          apiFetch<ClergyApiRow[]>(`/Clergy/parish/${p.parishId}`, token),
        )),
        Promise.all(lcRows.map((lc) =>
          apiFetch<ClergyApiRow[]>(`/Clergy/localChurch/${lc.localChurchId}`, token),
        )),
      ]);

      const byId = new Map<number, ClergyApiRow>();
      for (const row of dioceseClergy) {
        if (row.isActive) byId.set(row.clergyID, row);
      }
      for (const list of parishLists) {
        for (const row of list) {
          if (row.isActive) byId.set(row.clergyID, row);
        }
      }
      for (const list of lcLists) {
        for (const row of list) {
          if (row.isActive) byId.set(row.clergyID, row);
        }
      }

      setOverview(ov);
      setParishes(parishRows);
      setLcs(lcRows);
      setCanonicalById(byId);
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingPage(false);
    }
  }, [token, dioceseId]);

  useEffect(() => { reload(); }, [reload]);

  // One-time CC pre-fill from diocese settings. Only fires when the wizard
  // hasn't already cached a CC list. Treats 403 / errors silently — the
  // bishop just sees an empty textarea, which they can fill in by hand.
  useEffect(() => {
    if (ccPrefilled) return;
    if (!token) return;
    if (wizardLoading) return;
    if (ccList && ccList.trim().length > 0) {
      setCcPrefilled(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const s = await apiFetch<DioceseSettings>(`/Admin/diocese/${dioceseId}/settings`, token);
        if (cancelled) return;
        const def = s.defaultLetterCc ?? "";
        if (def.trim().length > 0) setReview({ ccList: def });
      } catch {
        // No CC available — leave the field empty.
      } finally {
        if (!cancelled) setCcPrefilled(true);
      }
    })();
    return () => { cancelled = true; };
  }, [token, dioceseId, ccList, ccPrefilled, wizardLoading, setReview]);

  // --- derived: effective tree ---

  const parishesById = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of parishes) m.set(p.parishId, p.parishName);
    return m;
  }, [parishes]);

  const lcsById = useMemo(() => {
    const m = new Map<number, string>();
    for (const lc of lcs) m.set(lc.localChurchId, lc.localChurchName);
    return m;
  }, [lcs]);

  // Drafts keyed by clergyId for O(1) lookup during the merge.
  const draftByClergy = useMemo(() => {
    const m = new Map<number, TransferDraft>();
    for (const d of pastorDrafts) m.set(d.clergyId, d);
    for (const d of lcDrafts) m.set(d.clergyId, d);
    return m;
  }, [pastorDrafts, lcDrafts]);

  // Compute the merged "effective" view per clergy. Excludes any clergy
  // whose effective position can't be resolved (e.g. canonical is missing
  // and they're not in a draft) — those simply don't render.
  const effective = useMemo<EffectiveClergy[]>(() => {
    const out: EffectiveClergy[] = [];
    for (const row of canonicalById.values()) {
      const rankLabel = RANK_NAMES[row.clergyRank];
      if (!rankLabel) continue;
      // Skip the bishop row — it's shown separately at the top of the tree.
      if (rankLabel === "Bishop" || rankLabel === "ArchBishop"
        || rankLabel === "PresidingArchbishop") continue;
      // Evangelists are out of scope for the wizard.
      if (rankLabel === "Evangelist") continue;

      const canonicalLevelStr = LEVEL_NAMES[row.level];
      const canonicalLevel = (canonicalLevelStr === "Diocese"
        || canonicalLevelStr === "Parish"
        || canonicalLevelStr === "LocalChurch") ? (canonicalLevelStr as Level) : null;

      const draft = draftByClergy.get(row.clergyID);
      let effLevel: Level | null = canonicalLevel;
      let effLevelId: number | null = canonicalLevel ? row.levelID : null;
      let effIsInCharge: boolean = row.isInCharge;

      if (draft) {
        effLevel = draft.toLevel;
        effLevelId = draft.toLevelId;
        effIsInCharge = draft.isInCharge;
      }

      if (effLevel === null || effLevelId === null) continue;

      // Determine status. "moved" trumps "in-charge-changed".
      let status: EffectiveClergy["status"] = "stayed";
      const slotMoved = canonicalLevel !== effLevel
        || (canonicalLevel ? row.levelID : null) !== effLevelId;
      if (slotMoved) {
        status = "moved";
      } else if (row.isInCharge !== effIsInCharge) {
        status = "in-charge-changed";
      }

      out.push({
        clergyId: row.clergyID,
        name: row.clergyName,
        rankLabel,
        salutation: SALUTATION_BY_RANK[rankLabel] ?? "",
        ordinationDate: row.ordinationDate,
        canonicalLevel,
        canonicalLevelId: canonicalLevel ? row.levelID : null,
        canonicalIsInCharge: row.isInCharge,
        effectiveLevel: effLevel,
        effectiveLevelId: effLevelId,
        effectiveIsInCharge: effIsInCharge,
        status,
      });
    }
    return out;
  }, [canonicalById, draftByClergy]);

  // Group effective clergy by their effective slot. Used to render each
  // parish / LC subtree.
  const effectiveByParish = useMemo(() => {
    const m = new Map<number, EffectiveClergy[]>();
    for (const c of effective) {
      if (c.effectiveLevel !== "Parish") continue;
      if (!PASTOR_RANKS.has(c.rankLabel)) continue;
      if (!m.has(c.effectiveLevelId)) m.set(c.effectiveLevelId, []);
      m.get(c.effectiveLevelId)!.push(c);
    }
    // In-charge first, then by ordination date.
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        const aL = a.effectiveIsInCharge ? 0 : 1;
        const bL = b.effectiveIsInCharge ? 0 : 1;
        if (aL !== bL) return aL - bL;
        const ad = a.ordinationDate ? Date.parse(a.ordinationDate) : Number.POSITIVE_INFINITY;
        const bd = b.ordinationDate ? Date.parse(b.ordinationDate) : Number.POSITIVE_INFINITY;
        if (ad !== bd) return ad - bd;
        return a.clergyId - b.clergyId;
      });
    }
    return m;
  }, [effective]);

  const effectiveByLc = useMemo(() => {
    const m = new Map<number, EffectiveClergy[]>();
    for (const c of effective) {
      if (c.effectiveLevel !== "LocalChurch") continue;
      if (!LC_RANKS.has(c.rankLabel)) continue;
      if (!m.has(c.effectiveLevelId)) m.set(c.effectiveLevelId, []);
      m.get(c.effectiveLevelId)!.push(c);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        const aL = a.effectiveIsInCharge ? 0 : 1;
        const bL = b.effectiveIsInCharge ? 0 : 1;
        if (aL !== bL) return aL - bL;
        const rankOrder: Record<string, number> = { Deacon: 0, ChurchLeader: 1 };
        const ar = rankOrder[a.rankLabel] ?? 9;
        const br = rankOrder[b.rankLabel] ?? 9;
        if (ar !== br) return ar - br;
        const ad = a.ordinationDate ? Date.parse(a.ordinationDate) : Number.POSITIVE_INFINITY;
        const bd = b.ordinationDate ? Date.parse(b.ordinationDate) : Number.POSITIVE_INFINITY;
        if (ad !== bd) return ad - bd;
        return a.clergyId - b.clergyId;
      });
    }
    return m;
  }, [effective]);

  // LCs grouped by parish for the tree composition.
  const lcsByParish = useMemo(() => {
    const m = new Map<number, LcRow[]>();
    for (const lc of lcs) {
      if (!m.has(lc.localChurchParishID)) m.set(lc.localChurchParishID, []);
      m.get(lc.localChurchParishID)!.push(lc);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.localChurchName.localeCompare(b.localChurchName));
    }
    return m;
  }, [lcs]);

  // --- expand / collapse defaults ---

  // Compute the initial expand state once we have the data: a parish is
  // open by default if any of its parish-level clergy or any clergy in
  // any of its LCs has a status of moved / in-charge-changed. Same rule
  // for each LC. The bishop's eye is drawn straight to the changes.
  const initialExpanded = useMemo<Set<string>>(() => {
    const open = new Set<string>();
    for (const parish of parishes) {
      const parishClergy = effectiveByParish.get(parish.parishId) ?? [];
      const parishHasChange = parishClergy.some((c) => c.status !== "stayed");
      const lcRows = lcsByParish.get(parish.parishId) ?? [];
      let anyLcChange = false;
      for (const lc of lcRows) {
        const lcClergy = effectiveByLc.get(lc.localChurchId) ?? [];
        const lcHasChange = lcClergy.some((c) => c.status !== "stayed");
        if (lcHasChange) {
          open.add(`lc-${lc.localChurchId}`);
          anyLcChange = true;
        }
      }
      if (parishHasChange || anyLcChange) {
        open.add(`parish-${parish.parishId}`);
      }
    }
    return open;
  }, [parishes, effectiveByParish, effectiveByLc, lcsByParish]);

  // Initialise expanded from the computed defaults — but only once per data
  // load. After that, the bishop's manual clicks own the state.
  const [didInitExpand, setDidInitExpand] = useState(false);
  useEffect(() => {
    if (didInitExpand) return;
    if (loadingPage) return;
    setExpanded(new Set(initialExpanded));
    setDidInitExpand(true);
  }, [didInitExpand, loadingPage, initialExpanded]);

  const toggleNode = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const all = new Set<string>();
    for (const p of parishes) all.add(`parish-${p.parishId}`);
    for (const lc of lcs) all.add(`lc-${lc.localChurchId}`);
    setExpanded(all);
  }, [parishes, lcs]);

  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  // --- submit handler ---

  // The two drafts combined, filtered down to the ones that produce an
  // actual change. BatchConfirm will dedupe / skip no-ops but skipping
  // them here keeps the response counts tidy + saves a tiny bit of bandwidth.
  const draftsToSubmit = useMemo<TransferDraft[]>(() => {
    const all = [...pastorDrafts, ...lcDrafts];
    return all.filter((d) => {
      const canonical = canonicalById.get(d.clergyId);
      if (!canonical) return true; // No canonical row — definitely a change.
      const canonicalLevel = LEVEL_NAMES[canonical.level];
      const sameSlot = canonicalLevel === d.toLevel && canonical.levelID === d.toLevelId;
      const sameInCharge = canonical.isInCharge === d.isInCharge;
      // Send the draft if anything actually changes.
      return !(sameSlot && sameInCharge);
    });
  }, [pastorDrafts, lcDrafts, canonicalById]);

  const hasAnyDrafts = pastorDrafts.length > 0 || lcDrafts.length > 0;

  const onSubmit = useCallback(async () => {
    if (!token) return;
    if (draftsToSubmit.length === 0) {
      setSubmitError("No effective changes to submit.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body = {
        dioceseId,
        applyImmediately,
        effectiveDate: applyImmediately ? null : effectiveDate,
        ccList: ccList || null,
        drafts: draftsToSubmit,
      };
      const res = await apiFetch<BatchResult>(
        `/Bishop/transfers/batch-confirm`,
        token,
        { method: "POST", json: body },
      );
      setResult(res);
      // Clear the draft on the server so a fresh wizard run starts blank.
      // If the discard call fails we still consider the submit a success —
      // the draft is harmless and can be cleared from a future visit.
      try {
        await apiFetch(`/Bishop/diocese/${dioceseId}/transfer-drafts`, token, {
          method: "DELETE",
        });
      } catch {
        // Swallow — surfaced via the toast's "Go now" link instead.
      }
      // Auto-redirect after a short pause so the bishop can read the toast.
      setRedirectIn(1500);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }, [token, dioceseId, applyImmediately, effectiveDate, ccList, draftsToSubmit]);

  // Drive the auto-redirect timer. Pulled out of onSubmit so the
  // "Go now" link can fire the navigation immediately and short-circuit.
  useEffect(() => {
    if (redirectIn === null) return;
    const t = setTimeout(() => {
      router.push(`/diocese/${dioceseId}`);
    }, redirectIn);
    return () => clearTimeout(t);
  }, [redirectIn, router, dioceseId]);

  // --- render helpers ---

  const nameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const row of canonicalById.values()) {
      const rank = RANK_NAMES[row.clergyRank];
      const sal = rank ? SALUTATION_BY_RANK[rank] ?? "" : "";
      m.set(row.clergyID, clergyDisplayName(row.clergyName, rank, sal));
    }
    return m;
  }, [canonicalById]);

  // A single row in the tree. Renders the ★ glyph, name, rank chip, and
  // status pill. Outline colour follows the spec.
  const ClergyRow = ({ c }: { c: EffectiveClergy }) => {
    const display = clergyDisplayName(c.name, c.rankLabel, c.salutation);
    const outline =
      c.status === "moved" ? "border-2 border-emerald-500" :
      c.status === "in-charge-changed" ? "border-2 border-amber-500" :
      "border border-gray-200";
    const subline = (() => {
      if (c.status === "moved") {
        const from = locationLabel(
          c.canonicalLevel,
          c.canonicalLevelId,
          parishesById,
          lcsById,
          overview?.dioceseName ?? "Diocese",
        );
        return `${c.rankLabel} · moved from ${from}`;
      }
      if (c.status === "in-charge-changed") {
        return c.effectiveIsInCharge
          ? `${c.rankLabel} · now in-charge`
          : `${c.rankLabel} · no longer in-charge`;
      }
      return `${c.rankLabel} · stayed`;
    })();

    const pill = c.status === "moved" ? (
      <span className="bg-emerald-100 text-emerald-900 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full">
        Moved
      </span>
    ) : c.status === "in-charge-changed" ? (
      <span className="bg-amber-100 text-amber-900 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full">
        In-charge changed
      </span>
    ) : null;

    return (
      <div
        className={`flex items-center gap-2 rounded-md bg-white px-2.5 py-1.5 transition-shadow hover:shadow-sm ${outline}`}
      >
        <span
          className={`text-amber-500 text-base leading-none ${c.effectiveIsInCharge ? "" : "invisible"}`}
          aria-hidden
          title={c.effectiveIsInCharge ? "in-charge" : ""}
        >
          ★
        </span>
        <span className="text-sm font-medium text-gray-900 truncate">{display}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${rankChip(c.rankLabel)}`}>
          {c.rankLabel}
        </span>
        <span className="text-[11px] text-gray-500 truncate ml-1">{subline}</span>
        <span className="ml-auto shrink-0">{pill}</span>
      </div>
    );
  };

  // --- render ---

  if (loadingPage || wizardLoading) {
    return (
      <div className="container mx-auto px-6 py-6 text-gray-500">Loading review…</div>
    );
  }

  const totalChangedRows = effective.filter((c) => c.status !== "stayed").length;
  const minDate = todayIso();

  return (
    <div className="container mx-auto px-4 py-4">
      <header className="mb-4">
        <h1 className="text-xl font-bold">Review transfers</h1>
        <p className="text-xs text-gray-600">
          Step 3 of 3 · confirm the moves and submit.
        </p>
      </header>

      {(pageError || wizardError) && (
        <div className="mb-3 bg-red-50 border border-red-300 text-red-800 rounded p-2 text-xs">
          {pageError ?? wizardError}
        </div>
      )}

      {!hasAnyDrafts ? (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <h2 className="text-base font-semibold text-gray-900 mb-1">No changes to review</h2>
          <p className="text-sm text-gray-600 mb-4">
            Both the Pastors and Local-Churches boards are at their canonical state.
            Stage a move on either step before submitting.
          </p>
          <Link
            href="/transfers"
            className="inline-block text-sm px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700"
          >
            ← Back to Pastors
          </Link>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* Tree */}
          <div className="flex-1 w-full min-w-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600">
                <span className="font-semibold text-gray-900">{totalChangedRows}</span>
                {" "}clergy will change. Stayed rows are muted; emerald = moved; amber = in-charge changed.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={expandAll}
                  className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                >
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50"
                >
                  Collapse all
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
              {/* Diocese root */}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-500 text-sm">▼</span>
                  <h2 className="text-base font-semibold text-gray-900">
                    {overview?.dioceseName ?? `Diocese ${dioceseId}`}
                  </h2>
                  <span className="text-xs text-gray-500">
                    {parishes.length} parish{parishes.length === 1 ? "" : "es"}
                  </span>
                </div>
                {overview && overview.bishops.length > 0 && (
                  <div className="ml-6 mt-1 space-y-1">
                    {overview.bishops.map((b) => {
                      const display = clergyDisplayName(b.clergyName, "Bishop", "Rt Rev");
                      return (
                        <div
                          key={b.clergyID}
                          className="flex items-center gap-2 rounded-md bg-white px-2.5 py-1.5 border border-gray-200"
                        >
                          <span className={`text-amber-500 text-base leading-none ${b.isInCharge ? "" : "invisible"}`}>★</span>
                          <span className="text-sm font-medium text-gray-900 truncate">{display}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${rankChip("Bishop")}`}>Bishop</span>
                          <span className="text-[11px] text-gray-500 ml-1">Bishop · read-only</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Parishes */}
              <div className="ml-6 space-y-2">
                {parishes.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No parishes in this diocese.</p>
                ) : (
                  parishes.map((p) => {
                    const key = `parish-${p.parishId}`;
                    const isOpen = expanded.has(key);
                    const parishClergy = effectiveByParish.get(p.parishId) ?? [];
                    const lcRows = lcsByParish.get(p.parishId) ?? [];
                    const parishChangeCount = parishClergy.filter((c) => c.status !== "stayed").length;
                    const lcChangeCount = lcRows.reduce((acc, lc) => {
                      const arr = effectiveByLc.get(lc.localChurchId) ?? [];
                      return acc + arr.filter((c) => c.status !== "stayed").length;
                    }, 0);
                    const totalChange = parishChangeCount + lcChangeCount;
                    return (
                      <div key={p.parishId}>
                        <button
                          type="button"
                          onClick={() => toggleNode(key)}
                          className="flex items-baseline gap-2 w-full text-left hover:bg-gray-50 rounded px-1 py-0.5"
                        >
                          <span className="text-gray-500 text-sm">{isOpen ? "▼" : "▶"}</span>
                          <h3 className="text-sm font-semibold text-gray-900">{p.parishName}</h3>
                          <span className="text-[11px] text-gray-500">
                            {parishClergy.length} clergy · {lcRows.length} LC{lcRows.length === 1 ? "" : "s"}
                            {totalChange > 0 && (
                              <span className="ml-1.5 bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded text-[10px]">
                                {totalChange} change{totalChange === 1 ? "" : "s"}
                              </span>
                            )}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="ml-6 mt-1 space-y-1">
                            {parishClergy.length === 0 && (
                              <p className="text-[11px] text-gray-400 italic px-1">No Pastor / Archdeacon assigned.</p>
                            )}
                            {parishClergy.map((c) => (
                              <ClergyRow key={c.clergyId} c={c} />
                            ))}
                            {lcRows.map((lc) => {
                              const lcKey = `lc-${lc.localChurchId}`;
                              const lcOpen = expanded.has(lcKey);
                              const lcClergy = effectiveByLc.get(lc.localChurchId) ?? [];
                              const lcChange = lcClergy.filter((c) => c.status !== "stayed").length;
                              return (
                                <div key={lc.localChurchId} className="mt-1">
                                  <button
                                    type="button"
                                    onClick={() => toggleNode(lcKey)}
                                    className="flex items-baseline gap-2 w-full text-left hover:bg-gray-50 rounded px-1 py-0.5"
                                  >
                                    <span className="text-gray-500 text-sm">{lcOpen ? "▼" : "▶"}</span>
                                    <h4 className="text-sm font-medium text-gray-800">
                                      {lc.localChurchName}
                                      {lc.localChurchCode && (
                                        <span className="ml-1 text-xs text-gray-500 font-normal">({lc.localChurchCode})</span>
                                      )}
                                    </h4>
                                    <span className="text-[11px] text-gray-500">
                                      {lcClergy.length} clergy
                                      {lcChange > 0 && (
                                        <span className="ml-1.5 bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded text-[10px]">
                                          {lcChange} change{lcChange === 1 ? "" : "s"}
                                        </span>
                                      )}
                                    </span>
                                  </button>
                                  {lcOpen && (
                                    <div className="ml-6 mt-1 space-y-1">
                                      {lcClergy.length === 0 ? (
                                        <p className="text-[11px] text-gray-400 italic px-1">No Deacon / Church Leader assigned.</p>
                                      ) : (
                                        lcClergy.map((c) => (
                                          <ClergyRow key={c.clergyId} c={c} />
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Submit panel */}
          <aside className="w-full lg:w-80 shrink-0 lg:sticky lg:top-32 bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Submit transfers</h2>
            <p className="text-[11px] text-gray-500">
              {draftsToSubmit.length} effective change{draftsToSubmit.length === 1 ? "" : "s"} will be sent.
            </p>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={applyImmediately}
                onChange={(e) => setReview({ applyImmediately: e.target.checked })}
              />
              Apply immediately
            </label>

            <label className="flex flex-col text-sm">
              <span className="text-gray-600 text-xs">Effective date</span>
              <input
                type="date"
                min={minDate}
                value={applyImmediately ? "" : (effectiveDate ?? "")}
                onChange={(e) => setReview({ effectiveDate: e.target.value || null })}
                disabled={applyImmediately}
                placeholder={applyImmediately ? "Today" : ""}
                className="border rounded px-2 py-1 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <span className="text-[10px] text-gray-500 mt-0.5">
                {applyImmediately
                  ? "Ignored while Apply immediately is checked."
                  : "Move takes effect on this date."}
              </span>
            </label>

            <label className="flex flex-col text-sm">
              <span className="text-gray-600 text-xs">CC list (one per line)</span>
              <textarea
                value={ccList}
                onChange={(e) => setReview({ ccList: e.target.value })}
                rows={4}
                className="border rounded px-2 py-1 font-mono text-xs"
                placeholder="Most Rev Samson Muthuri&#10;Ven Joseph Gatundu"
              />
              <span className="text-[10px] text-gray-500 mt-0.5">
                Pre-filled from diocese settings; edit to override this batch.
              </span>
            </label>

            {submitError && (
              <div className="bg-red-50 border border-red-300 text-red-800 rounded p-2 text-xs">
                {submitError}
              </div>
            )}

            {result && (
              <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded p-2 text-xs space-y-1">
                <p className="font-semibold">
                  {result.applied} applied · {result.scheduled} scheduled
                  {result.skipped.length > 0 ? ` · ${result.skipped.length} skipped` : ""}
                </p>
                {result.skipped.length > 0 && (
                  <ul className="list-disc list-inside text-[11px] text-emerald-900/80">
                    {result.skipped.map((s) => (
                      <li key={s.clergyId}>{describeSkip(s, nameById)}</li>
                    ))}
                  </ul>
                )}
                <p className="text-[11px]">
                  Redirecting to the diocese dashboard…{" "}
                  <button
                    type="button"
                    onClick={() => router.push(`/diocese/${dioceseId}`)}
                    className="underline font-medium"
                  >
                    Go now
                  </button>
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Link
                href="/transfers/lc"
                className="text-xs text-blue-700 hover:underline"
              >
                ← Back to LCs
              </Link>
              <button
                type="button"
                disabled={submitting || draftsToSubmit.length === 0 || result !== null}
                onClick={onSubmit}
                className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting…" : "Submit →"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
