"use client";

// Page 2 of the transfers wizard — Deacon / ChurchLeader reassignment
// across the LCs of the bishop's diocese. Two-column layout: an
// "Unassigned" pool on the left, a vertical list of Parish groups (each
// containing the Parish's LCs) on the right. Every drop mutates the
// wizard context's lcDrafts which auto-saves to /Bishop/diocese/{id}/
// transfer-drafts/lcs.
//
// LC header surfaces the *new* in-charge Pastor as decided on Page 1 so
// the bishop sees the lead context for each LC at decision time.
//
// See spec docs/superpowers/specs/2026-05-16-transfers-wizard-design.md
// (Frontend → Page 2) for the full behaviour.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { apiFetch } from "@/lib/apiClient";
import { SALUTATION_BY_RANK, clergyDisplayName } from "@/lib/clergyDisplay";
import { ClergyChip } from "../ClergyChip";
import {
  registerClergyMeta,
  useWizard,
  type ClergyOnBoard,
  type Rank,
  type TransferDraft,
} from "../wizard-context";

// Mirror C# enums (see Page 1 for the same maps).
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

// Page 2 only accepts Deacons + ChurchLeaders.
const LC_RANKS: ReadonlySet<Rank> = new Set(["Deacon", "ChurchLeader"]);

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

// --- helpers ---

function zoneIdForLc(lcId: number | null): string {
  return lcId === null ? "zone-unassigned" : `zone-LocalChurch-${lcId}`;
}

function parseZoneId(id: string): { lcId: number | null } | null {
  if (id === "zone-unassigned") return { lcId: null };
  const m = /^zone-LocalChurch-(\d+)$/.exec(id);
  if (!m) return null;
  return { lcId: Number(m[1]) };
}

function draggableIdFor(clergyId: number): string { return `clergy-${clergyId}`; }

function clergyIdFromDraggable(id: string): number | null {
  const m = /^clergy-(\d+)$/.exec(id);
  return m ? Number(m[1]) : null;
}

// --- sub-components ---

function DraggableChip({
  clergy, isInCharge, onClick, accepting,
}: {
  clergy: ClergyOnBoard;
  isInCharge: boolean;
  onClick?: () => void;
  accepting: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: draggableIdFor(clergy.clergyId),
    data: { rank: clergy.rankLabel, clergyId: clergy.clergyId },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${accepting ? "" : "opacity-30"}`}
    >
      <ClergyChip
        clergy={clergy}
        isInCharge={isInCharge}
        onClick={onClick}
        isDragging={isDragging}
      />
    </div>
  );
}

function LcZone({
  lc, parishName, inChargePastorLabel, occupants, activeRank,
  computeInCharge, onChipClick,
}: {
  lc: LcRow;
  parishName: string;
  inChargePastorLabel: string;
  occupants: ClergyOnBoard[];
  activeRank: Rank | null;
  computeInCharge: (c: ClergyOnBoard) => boolean;
  onChipClick: (lcId: number) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: zoneIdForLc(lc.localChurchId),
    data: { level: "LocalChurch", levelId: lc.localChurchId },
  });
  const invalidForDrag = activeRank !== null && !LC_RANKS.has(activeRank);
  const needsLeadPick = occupants.length >= 2 && !occupants.some(computeInCharge);
  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border p-3 transition-colors
        ${invalidForDrag ? "opacity-30 border-dashed border-gray-300 bg-white" : ""}
        ${isOver && !invalidForDrag ? "ring-2 ring-red-400 bg-red-50" : ""}
        ${needsLeadPick ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white"}`}
    >
      <header className="mb-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {lc.localChurchName}
            {lc.localChurchCode && (
              <span className="ml-1 text-xs text-gray-500 font-normal">({lc.localChurchCode})</span>
            )}
          </h3>
          <span className="text-[11px] text-gray-500 shrink-0">
            {occupants.length} clergy
            {needsLeadPick && (
              <span className="ml-1 bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded text-[10px]">
                Pick lead
              </span>
            )}
          </span>
        </div>
        <p className="text-[10px] text-gray-500 truncate">
          {parishName} · Pastor in-charge: {inChargePastorLabel}
        </p>
      </header>
      {occupants.length === 0 ? (
        <p className="text-[11px] text-gray-400 italic px-1 py-3">
          Drop Deacon / Church Leader here
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {occupants.map((c) => (
            <DraggableChip
              key={c.clergyId}
              clergy={c}
              isInCharge={computeInCharge(c)}
              onClick={occupants.length >= 2 ? () => onChipClick(lc.localChurchId) : undefined}
              accepting
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UnassignedPool({
  clergy, activeRank, computeInCharge,
}: {
  clergy: ClergyOnBoard[];
  activeRank: Rank | null;
  computeInCharge: (c: ClergyOnBoard) => boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: "zone-unassigned" });
  const invalidForDrag = activeRank !== null && !LC_RANKS.has(activeRank);
  return (
    <aside
      ref={setNodeRef}
      className={`w-72 shrink-0 sticky top-32 self-start rounded-lg border-2 border-dashed p-3
        ${invalidForDrag ? "opacity-30 border-gray-300" : "border-gray-300 bg-white"}
        ${isOver && !invalidForDrag ? "ring-2 ring-red-400 bg-red-50" : ""}`}
    >
      <h2 className="text-sm font-semibold text-gray-900 mb-1">
        Deacons &amp; Church Leaders
      </h2>
      <p className="text-[11px] text-gray-500 mb-2">Unassigned ({clergy.length})</p>
      {clergy.length === 0 ? (
        <p className="text-[11px] text-gray-400 italic">No clergy waiting here.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 max-h-[70vh] overflow-y-auto pr-1">
          {clergy.map((c) => (
            <DraggableChip
              key={c.clergyId}
              clergy={c}
              isInCharge={computeInCharge(c)}
              accepting
            />
          ))}
        </div>
      )}
    </aside>
  );
}

function PickLeadModal({
  lcName, occupants, currentInChargeId, onClose, onPick,
}: {
  lcName: string;
  occupants: ClergyOnBoard[];
  currentInChargeId: number | null;
  onClose: () => void;
  onPick: (clergyId: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(currentInChargeId);
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-base">Pick in-charge — {lcName}</h3>
        <p className="text-xs text-gray-600 mt-1">
          Select the clergy who leads this local church after the transfer takes effect.
        </p>
        <ul className="mt-3 space-y-1 max-h-64 overflow-y-auto">
          {occupants.map((c) => (
            <li key={c.clergyId}>
              <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="pick-lead"
                  checked={selected === c.clergyId}
                  onChange={() => setSelected(c.clergyId)}
                />
                <span className="text-sm">
                  {c.salutation}. {c.name}
                  <span className="text-xs text-gray-500"> · {c.rankLabel}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selected === null}
            onClick={() => {
              if (selected !== null) onPick(selected);
            }}
            className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Set as in-charge
          </button>
        </div>
      </div>
    </div>
  );
}

// --- main page ---

export default function LcBoardPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const {
    dioceseId, pastorDrafts, lcDrafts, setLcDrafts, restore, error,
  } = useWizard();

  const [clergy, setClergy] = useState<ClergyOnBoard[]>([]);
  const [parishes, setParishes] = useState<ParishRow[]>([]);
  const [lcs, setLcs] = useState<LcRow[]>([]);
  // Canonical in-charge pastor per parish — used as the fallback when
  // pastorDrafts doesn't have anything for the parish yet. Map of parishId
  // → display label of the in-charge clergy. Populated when we fetch each
  // parish's clergy roster (same call we already make on Page 1).
  const [canonicalParishLead, setCanonicalParishLead] = useState<Map<number, string>>(new Map());
  // Pastor display labels keyed by clergyId so we can resolve a draft's
  // clergyId to a name without re-fetching.
  const [pastorLabels, setPastorLabels] = useState<Map<number, string>>(new Map());

  const [loadingBoard, setLoadingBoard] = useState(true);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeRank, setActiveRank] = useState<Rank | null>(null);
  const [activeClergy, setActiveClergy] = useState<ClergyOnBoard | null>(null);
  const [pickLeadFor, setPickLeadFor] = useState<number | null>(null);
  // Per-parish collapse state — start with everything expanded so the
  // bishop sees the full board on first paint.
  const [collapsedParishes, setCollapsedParishes] = useState<Set<number>>(new Set());

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // --- data load ---

  const reload = useCallback(async () => {
    if (!token) return;
    setLoadingBoard(true);
    setBoardError(null);
    try {
      const [parishRows, lcRows] = await Promise.all([
        apiFetch<ParishRow[]>(`/Churches/diocese-parishes/${dioceseId}`, token),
        apiFetch<LcRow[]>(`/Churches/diocese/${dioceseId}`, token),
      ]);

      // Parish clergy lists for the canonical "Pastor in-charge" fallback.
      const parishClergyLists = await Promise.all(
        parishRows.map((p) =>
          apiFetch<ClergyApiRow[]>(`/Clergy/parish/${p.parishId}`, token),
        ),
      );
      // LC clergy lists for the board itself.
      const lcClergyLists = await Promise.all(
        lcRows.map((lc) =>
          apiFetch<ClergyApiRow[]>(`/Clergy/localChurch/${lc.localChurchId}`, token),
        ),
      );

      // Build canonical parish-lead and pastor-label maps before filtering
      // the LC roster.
      const parishLead = new Map<number, string>();
      const pLabels = new Map<number, string>();
      parishClergyLists.forEach((list, idx) => {
        const parish = parishRows[idx];
        for (const row of list) {
          if (!row.isActive) continue;
          const rankName = RANK_NAMES[row.clergyRank];
          if (rankName !== "Pastor" && rankName !== "ArchDeacon") continue;
          const sal = SALUTATION_BY_RANK[rankName] ?? "";
          const label = clergyDisplayName(row.clergyName, rankName, sal);
          pLabels.set(row.clergyID, label);
          if (row.isInCharge && !parishLead.has(parish.parishId)) {
            parishLead.set(parish.parishId, label);
          }
        }
      });

      // Now collect the Deacon + CL clergy across the diocese.
      const board: ClergyOnBoard[] = [];
      const seen = new Set<number>();
      for (const list of lcClergyLists) {
        for (const row of list) {
          if (!row.isActive) continue;
          if (seen.has(row.clergyID)) continue;
          seen.add(row.clergyID);
          const rankName = RANK_NAMES[row.clergyRank] as Rank | undefined;
          const levelName = LEVEL_NAMES[row.level];
          if (!rankName) continue;
          if (rankName !== "Deacon" && rankName !== "ChurchLeader") continue;
          if (levelName !== "LocalChurch") continue;
          board.push({
            clergyId: row.clergyID,
            name: row.clergyName,
            salutation: SALUTATION_BY_RANK[rankName] ?? "",
            rankLabel: rankName,
            photoUrl: row.photoUrl,
            ordinationDate: row.ordinationDate,
            currentLevel: "LocalChurch",
            currentLevelId: row.levelID,
          });
        }
      }
      registerClergyMeta(board);
      setClergy(board);
      setParishes(parishRows);
      setLcs(lcRows);
      setCanonicalParishLead(parishLead);
      setPastorLabels(pLabels);
    } catch (e: unknown) {
      setBoardError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingBoard(false);
    }
  }, [token, dioceseId]);

  useEffect(() => { reload(); }, [reload]);

  // --- derived state ---

  const draftByClergy = useMemo(() => {
    const m = new Map<number, TransferDraft>();
    for (const d of lcDrafts) m.set(d.clergyId, d);
    return m;
  }, [lcDrafts]);

  const effectiveLc = useCallback((c: ClergyOnBoard): number | null => {
    const d = draftByClergy.get(c.clergyId);
    if (d) {
      if (d.toLevel === "LocalChurch") return d.toLevelId;
      return null;
    }
    return c.currentLevelId;
  }, [draftByClergy]);

  const effectiveInCharge = useCallback((c: ClergyOnBoard): boolean => {
    const d = draftByClergy.get(c.clergyId);
    if (d) return d.isInCharge;
    return false;
  }, [draftByClergy]);

  // Lookup: parishId → in-charge pastor label. Prefer the draft state from
  // Page 1; fall back to the canonical map we built at load time.
  const draftPastorInChargeByParish = useMemo(() => {
    const m = new Map<number, string>();
    for (const d of pastorDrafts) {
      if (d.toLevel !== "Parish" || !d.isInCharge) continue;
      const label = pastorLabels.get(d.clergyId);
      if (label) m.set(d.toLevelId, label);
    }
    return m;
  }, [pastorDrafts, pastorLabels]);

  const pastorLabelForParish = useCallback((parishId: number): string => {
    return draftPastorInChargeByParish.get(parishId)
      ?? canonicalParishLead.get(parishId)
      ?? "—";
  }, [draftPastorInChargeByParish, canonicalParishLead]);

  // Map lcId → in-charge clergyId (from drafts) for modal pre-selection.
  const inChargeByLc = useMemo(() => {
    const m = new Map<number, number>();
    for (const d of lcDrafts) {
      if (d.toLevel !== "LocalChurch" || !d.isInCharge) continue;
      m.set(d.toLevelId, d.clergyId);
    }
    return m;
  }, [lcDrafts]);

  const matches = useCallback((c: ClergyOnBoard): boolean => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.rankLabel.toLowerCase().includes(q);
  }, [search]);

  // Sort within each LC: in-charge first, then Deacons before CLs, then
  // ordination date asc.
  const sortClergy = useCallback((a: ClergyOnBoard, b: ClergyOnBoard): number => {
    const aL = effectiveInCharge(a) ? 0 : 1;
    const bL = effectiveInCharge(b) ? 0 : 1;
    if (aL !== bL) return aL - bL;
    const rankOrder: Record<string, number> = { Deacon: 0, ChurchLeader: 1 };
    const ar = rankOrder[a.rankLabel] ?? 9;
    const br = rankOrder[b.rankLabel] ?? 9;
    if (ar !== br) return ar - br;
    const ad = a.ordinationDate ? Date.parse(a.ordinationDate) : Number.POSITIVE_INFINITY;
    const bd = b.ordinationDate ? Date.parse(b.ordinationDate) : Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;
    return a.clergyId - b.clergyId;
  }, [effectiveInCharge]);

  const occupantsByLc = useMemo(() => {
    const m = new Map<number, ClergyOnBoard[]>();
    for (const c of clergy) {
      const lcId = effectiveLc(c);
      if (lcId === null) continue;
      if (!m.has(lcId)) m.set(lcId, []);
      m.get(lcId)!.push(c);
    }
    for (const arr of m.values()) arr.sort(sortClergy);
    return m;
  }, [clergy, effectiveLc, sortClergy]);

  const unassignedClergy = useMemo(() => {
    return clergy
      .filter((c) => effectiveLc(c) === null)
      .sort(sortClergy);
  }, [clergy, effectiveLc, sortClergy]);

  // LCs grouped by parishId for the collapsible layout.
  const lcsByParish = useMemo(() => {
    const m = new Map<number, LcRow[]>();
    for (const lc of lcs) {
      if (!m.has(lc.localChurchParishID)) m.set(lc.localChurchParishID, []);
      m.get(lc.localChurchParishID)!.push(lc);
    }
    // Stable sort by LC name within each parish.
    for (const arr of m.values()) {
      arr.sort((a, b) => a.localChurchName.localeCompare(b.localChurchName));
    }
    return m;
  }, [lcs]);

  // Disable Next when any LC with 2+ clergy lacks an in-charge.
  const anyLcNeedsLead = useMemo(() => {
    for (const occ of occupantsByLc.values()) {
      if (occ.length >= 2 && !occ.some(effectiveInCharge)) return true;
    }
    return false;
  }, [occupantsByLc, effectiveInCharge]);

  // --- mutations ---

  const moveClergy = useCallback((clergyId: number, toLcId: number | null) => {
    const next = lcDrafts.filter((d) => d.clergyId !== clergyId);
    if (toLcId !== null) {
      next.push({
        clergyId,
        toLevel: "LocalChurch",
        toLevelId: toLcId,
        isInCharge: false,
      });
    }
    setLcDrafts(next);
  }, [lcDrafts, setLcDrafts]);

  const pickInCharge = useCallback((lcId: number, winnerClergyId: number) => {
    const inLc = clergy.filter((c) => effectiveLc(c) === lcId);
    const next: TransferDraft[] = lcDrafts
      .filter((d) => !(d.toLevel === "LocalChurch" && d.toLevelId === lcId))
      .map((d) => ({ ...d }));
    for (const c of inLc) {
      next.push({
        clergyId: c.clergyId,
        toLevel: "LocalChurch",
        toLevelId: lcId,
        isInCharge: c.clergyId === winnerClergyId,
      });
    }
    setLcDrafts(next);
  }, [clergy, effectiveLc, lcDrafts, setLcDrafts]);

  const onDragStart = (e: DragStartEvent) => {
    const cid = clergyIdFromDraggable(String(e.active.id));
    if (cid === null) return;
    const c = clergy.find((x) => x.clergyId === cid);
    if (!c) return;
    setActiveRank(c.rankLabel);
    setActiveClergy(c);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveRank(null);
    setActiveClergy(null);
    if (!e.over) return;
    const cid = clergyIdFromDraggable(String(e.active.id));
    if (cid === null) return;
    const moved = clergy.find((c) => c.clergyId === cid);
    if (!moved) return;
    const target = parseZoneId(String(e.over.id));
    if (!target) return;
    if (target.lcId !== null && !LC_RANKS.has(moved.rankLabel)) return;
    if (effectiveLc(moved) === target.lcId) return;
    moveClergy(moved.clergyId, target.lcId);
  };

  const unassignAll = () => {
    if (!window.confirm(
      "Move every Deacon and Church Leader to the unassigned pool? You can still drag them back before submitting.",
    )) return;
    setLcDrafts([]);
  };

  const onRestore = () => {
    if (!window.confirm(
      "Discard your pastor + LC draft and reload the canonical assignments from the server?",
    )) return;
    restore();
  };

  const toggleParish = (parishId: number) => {
    setCollapsedParishes((prev) => {
      const next = new Set(prev);
      if (next.has(parishId)) next.delete(parishId); else next.add(parishId);
      return next;
    });
  };

  // --- render ---

  if (loadingBoard) {
    return (
      <div className="container mx-auto px-6 py-6 text-gray-500">Loading local churches…</div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 space-y-4">
      <header className="flex flex-wrap items-baseline gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold">Deacons &amp; Church Leaders</h1>
          <p className="text-xs text-gray-600">
            Drag clergy between local churches. The Pastor-in-charge label
            reflects your Page 1 draft so you can see the new lead while
            placing Deacons / CLs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clergy…"
            className="border rounded px-2 py-1 text-sm w-48"
          />
          <button
            type="button"
            onClick={unassignAll}
            className="border border-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded hover:bg-gray-50"
          >
            Unassign all
          </button>
          <button
            type="button"
            onClick={onRestore}
            className="border border-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded hover:bg-gray-50"
          >
            Restore
          </button>
          <Link
            href="/transfers/review"
            aria-disabled={anyLcNeedsLead}
            onClick={(e) => { if (anyLcNeedsLead) e.preventDefault(); }}
            className={`text-sm px-3 py-1.5 rounded ${anyLcNeedsLead
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-red-600 text-white hover:bg-red-700"}`}
            title={anyLcNeedsLead ? "Resolve in-charge picks before moving on" : ""}
          >
            Next →
          </Link>
        </div>
      </header>

      {(error || boardError) && (
        <div className="bg-red-50 border border-red-300 text-red-800 rounded p-2 text-xs">
          {error ?? boardError}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <UnassignedPool
            clergy={unassignedClergy.filter(matches)}
            activeRank={activeRank}
            computeInCharge={effectiveInCharge}
          />
          <div className="flex-1 space-y-3 w-full">
            {parishes.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No parishes in this diocese.</p>
            ) : (
              parishes.map((parish) => {
                const parishLcs = lcsByParish.get(parish.parishId) ?? [];
                const isCollapsed = collapsedParishes.has(parish.parishId);
                if (parishLcs.length === 0) return null;
                return (
                  <section
                    key={parish.parishId}
                    className="bg-gray-50 border border-gray-200 rounded-md p-3"
                  >
                    <button
                      type="button"
                      onClick={() => toggleParish(parish.parishId)}
                      className="flex w-full items-baseline justify-between text-left"
                    >
                      <h2 className="text-sm font-semibold text-gray-900">
                        <span className="text-gray-500 mr-1">{isCollapsed ? "▶" : "▼"}</span>
                        {parish.parishName}
                      </h2>
                      <span className="text-[11px] text-gray-500">
                        {parishLcs.length} LC{parishLcs.length === 1 ? "" : "s"}
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                        {parishLcs.map((lc) => {
                          const occ = (occupantsByLc.get(lc.localChurchId) ?? []).filter(matches);
                          return (
                            <LcZone
                              key={lc.localChurchId}
                              lc={lc}
                              parishName={parish.parishName}
                              inChargePastorLabel={pastorLabelForParish(parish.parishId)}
                              occupants={occ}
                              activeRank={activeRank}
                              computeInCharge={effectiveInCharge}
                              onChipClick={(lcId) => setPickLeadFor(lcId)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </div>
        </div>
        <DragOverlay>
          {activeClergy ? (
            <ClergyChip
              clergy={activeClergy}
              isInCharge={effectiveInCharge(activeClergy)}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {pickLeadFor !== null && (
        <PickLeadModal
          lcName={(() => {
            const lc = lcs.find((x) => x.localChurchId === pickLeadFor);
            if (!lc) return "Local church";
            return lc.localChurchName + (lc.localChurchCode ? ` (${lc.localChurchCode})` : "");
          })()}
          occupants={(occupantsByLc.get(pickLeadFor) ?? [])}
          currentInChargeId={inChargeByLc.get(pickLeadFor) ?? null}
          onClose={() => setPickLeadFor(null)}
          onPick={(clergyId) => {
            pickInCharge(pickLeadFor, clergyId);
            setPickLeadFor(null);
          }}
        />
      )}
    </div>
  );
}
