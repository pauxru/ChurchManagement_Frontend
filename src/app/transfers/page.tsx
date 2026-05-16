"use client";

// Page 1 of the transfers wizard — Pastor / ArchDeacon reassignment across
// the parishes of the bishop's diocese. Two-column layout: an "Unassigned"
// pool on the left, a vertical list of Parish drop zones on the right.
// Every drop mutates the wizard context's pastorDrafts which auto-saves
// to /Bishop/diocese/{id}/transfer-drafts/pastors.
//
// See spec docs/superpowers/specs/2026-05-16-transfers-wizard-design.md
// (Frontend → Page 1) for the full behaviour. The legacy single-page board
// at /diocese/[id]/transfers stays as-is for back-compat.

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
import { SALUTATION_BY_RANK } from "@/lib/clergyDisplay";
import { ClergyChip } from "./ClergyChip";
import {
  registerClergyMeta,
  useWizard,
  type ClergyOnBoard,
  type Rank,
  type TransferDraft,
} from "./wizard-context";

// Mirror the C# enums. Defined inline to keep the page self-contained;
// the legacy Board.tsx uses the same maps. Strings line up with the
// backend's PascalCase enum names so TransferDraft.toLevel maps cleanly.
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

// What the page accepts on Page 1. Pastor + ArchDeacon only — Deacons/CLs
// belong on Page 2 and Evangelists are excluded from the wizard entirely.
const PARISH_RANKS: ReadonlySet<Rank> = new Set(["Pastor", "ArchDeacon"]);

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

// --- helpers ---

function zoneIdForParish(parishId: number | null): string {
  return parishId === null ? "zone-unassigned" : `zone-Parish-${parishId}`;
}

function parseZoneId(id: string): { parishId: number | null } | null {
  if (id === "zone-unassigned") return { parishId: null };
  const m = /^zone-Parish-(\d+)$/.exec(id);
  if (!m) return null;
  return { parishId: Number(m[1]) };
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
  // When a drag is in progress, this card may be dimmed if its rank doesn't
  // belong to any compatible zone. Page 1 only ever drags Pastor/ArchDeacon
  // chips so this is always true for visible chips, but the prop keeps the
  // door open for future rank mixing.
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

// Drop target wrapper. Greys to 30 % when the dragged rank doesn't fit.
function ParishZone({
  parish, occupants, activeRank, computeInCharge, onChipClick,
}: {
  parish: ParishRow;
  occupants: ClergyOnBoard[];
  activeRank: Rank | null;
  computeInCharge: (c: ClergyOnBoard) => boolean;
  onChipClick: (c: ClergyOnBoard, parishId: number) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: zoneIdForParish(parish.parishId),
    data: { level: "Parish", levelId: parish.parishId },
  });
  const invalidForDrag = activeRank !== null && !PARISH_RANKS.has(activeRank);
  const needsLeadPick = occupants.length >= 2 && !occupants.some(computeInCharge);
  return (
    <section
      ref={setNodeRef}
      className={`rounded-lg border p-3 transition-colors
        ${invalidForDrag ? "opacity-30 border-dashed border-gray-300 bg-white" : ""}
        ${isOver && !invalidForDrag ? "ring-2 ring-red-400 bg-red-50" : ""}
        ${needsLeadPick ? "border-amber-400 bg-amber-50" : "border-gray-200 bg-white"}`}
    >
      <header className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-900">{parish.parishName}</h2>
        <span className="text-xs text-gray-500">
          {occupants.length} clergy
          {needsLeadPick && (
            <span className="ml-2 bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded text-[10px]">
              Pick lead
            </span>
          )}
        </span>
      </header>
      {occupants.length === 0 ? (
        <p className="text-[11px] text-gray-400 italic px-1 py-3">
          Drop Pastor / ArchDeacon here
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {occupants.map((c) => (
            <DraggableChip
              key={c.clergyId}
              clergy={c}
              isInCharge={computeInCharge(c)}
              onClick={occupants.length >= 2 ? () => onChipClick(c, parish.parishId) : undefined}
              accepting
            />
          ))}
        </div>
      )}
    </section>
  );
}

// Left rail — pool of clergy with no pending parish assignment.
function UnassignedPool({
  clergy, activeRank, computeInCharge,
}: {
  clergy: ClergyOnBoard[];
  activeRank: Rank | null;
  computeInCharge: (c: ClergyOnBoard) => boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: "zone-unassigned" });
  const invalidForDrag = activeRank !== null && !PARISH_RANKS.has(activeRank);
  return (
    <aside
      ref={setNodeRef}
      className={`w-72 shrink-0 sticky top-32 self-start rounded-lg border-2 border-dashed p-3
        ${invalidForDrag ? "opacity-30 border-gray-300" : "border-gray-300 bg-white"}
        ${isOver && !invalidForDrag ? "ring-2 ring-red-400 bg-red-50" : ""}`}
    >
      <h2 className="text-sm font-semibold text-gray-900 mb-1">
        Pastors &amp; Archdeacons
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

// Manual override modal — lists every clergy currently in the parish with
// radio buttons. Pre-selects the existing in-charge so a no-op confirm
// keeps the state stable.
function PickLeadModal({
  parishName, occupants, currentInChargeId, onClose, onPick,
}: {
  parishName: string;
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
        <h3 className="font-semibold text-base">Pick in-charge — {parishName}</h3>
        <p className="text-xs text-gray-600 mt-1">
          Select the clergy who leads this parish after the transfer takes effect.
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

export default function PastorsBoardPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const {
    dioceseId, pastorDrafts, setPastorDrafts, restore, error,
  } = useWizard();

  const [clergy, setClergy] = useState<ClergyOnBoard[]>([]);
  const [parishes, setParishes] = useState<ParishRow[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeRank, setActiveRank] = useState<Rank | null>(null);
  const [activeClergy, setActiveClergy] = useState<ClergyOnBoard | null>(null);
  const [pickLeadFor, setPickLeadFor] = useState<number | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // --- data load ---

  const reload = useCallback(async () => {
    if (!token) return;
    setLoadingBoard(true);
    setBoardError(null);
    try {
      const [parishRows, bishops] = await Promise.all([
        apiFetch<ParishRow[]>(`/Churches/diocese-parishes/${dioceseId}`, token),
        apiFetch<ClergyApiRow[]>(`/Clergy/diocese/${dioceseId}`, token),
      ]);

      // Fetch each parish's Pastor + ArchDeacon roster in parallel.
      const parishClergyLists = await Promise.all(
        parishRows.map((p) =>
          apiFetch<ClergyApiRow[]>(`/Clergy/parish/${p.parishId}`, token),
        ),
      );

      const all: ClergyApiRow[] = [...bishops, ...parishClergyLists.flat()];
      const seen = new Set<number>();
      const board: ClergyOnBoard[] = [];
      for (const row of all) {
        if (!row.isActive) continue;
        if (seen.has(row.clergyID)) continue;
        seen.add(row.clergyID);
        const rankName = RANK_NAMES[row.clergyRank] as Rank | undefined;
        const levelName = LEVEL_NAMES[row.level];
        if (!rankName) continue;
        if (rankName !== "Pastor" && rankName !== "ArchDeacon") continue;
        if (levelName !== "Parish") continue;
        board.push({
          clergyId: row.clergyID,
          name: row.clergyName,
          salutation: SALUTATION_BY_RANK[rankName] ?? "",
          rankLabel: rankName,
          photoUrl: row.photoUrl,
          ordinationDate: row.ordinationDate,
          currentLevel: "Parish",
          currentLevelId: row.levelID,
        });
      }
      // Tell the wizard context about these clergy so the auto-in-charge
      // tie-breaker (sort by ordination date) has the meta it needs.
      registerClergyMeta(board);
      setClergy(board);
      setParishes(parishRows);
    } catch (e: unknown) {
      setBoardError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingBoard(false);
    }
  }, [token, dioceseId]);

  useEffect(() => { reload(); }, [reload]);

  // --- derived state ---

  // Each clergy's pending parish: from drafts if present, else their
  // canonical assignment.
  const draftByClergy = useMemo(() => {
    const m = new Map<number, TransferDraft>();
    for (const d of pastorDrafts) m.set(d.clergyId, d);
    return m;
  }, [pastorDrafts]);

  const effectiveParish = useCallback((c: ClergyOnBoard): number | null => {
    const d = draftByClergy.get(c.clergyId);
    if (d) {
      if (d.toLevel === "Parish") return d.toLevelId;
      return null;
    }
    return c.currentLevelId;
  }, [draftByClergy]);

  const effectiveInCharge = useCallback((c: ClergyOnBoard): boolean => {
    const d = draftByClergy.get(c.clergyId);
    if (d) return d.isInCharge;
    // Without a draft the auto-rule hasn't run for this clergy yet. Solo
    // occupant parishes still need an in-charge outline; surface that here
    // so the bishop sees a sensible default before any drag happens.
    return false;
  }, [draftByClergy]);

  // Which clergy is in-charge per parish (from drafts). Used by the modal
  // pre-selection.
  const inChargeByParish = useMemo(() => {
    const m = new Map<number, number>();
    for (const d of pastorDrafts) {
      if (d.toLevel !== "Parish" || !d.isInCharge) continue;
      m.set(d.toLevelId, d.clergyId);
    }
    return m;
  }, [pastorDrafts]);

  // Search filter for chips.
  const matches = useCallback((c: ClergyOnBoard): boolean => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.rankLabel.toLowerCase().includes(q);
  }, [search]);

  // Sort within each parish: in-charge first, then ordination date asc.
  const sortClergy = useCallback((a: ClergyOnBoard, b: ClergyOnBoard): number => {
    const aL = effectiveInCharge(a) ? 0 : 1;
    const bL = effectiveInCharge(b) ? 0 : 1;
    if (aL !== bL) return aL - bL;
    const ad = a.ordinationDate ? Date.parse(a.ordinationDate) : Number.POSITIVE_INFINITY;
    const bd = b.ordinationDate ? Date.parse(b.ordinationDate) : Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;
    return a.clergyId - b.clergyId;
  }, [effectiveInCharge]);

  // Map parishId → occupants (sorted; not search-filtered — search is applied
  // at render time so the in-charge invariant doesn't break when the bishop
  // types).
  const occupantsByParish = useMemo(() => {
    const m = new Map<number, ClergyOnBoard[]>();
    for (const c of clergy) {
      const p = effectiveParish(c);
      if (p === null) continue;
      if (!m.has(p)) m.set(p, []);
      m.get(p)!.push(c);
    }
    for (const arr of m.values()) arr.sort(sortClergy);
    return m;
  }, [clergy, effectiveParish, sortClergy]);

  const unassignedClergy = useMemo(() => {
    return clergy
      .filter((c) => effectiveParish(c) === null)
      .sort(sortClergy);
  }, [clergy, effectiveParish, sortClergy]);

  // Next-disabled rule: any parish with 2+ clergy and no in-charge.
  const anyParishNeedsLead = useMemo(() => {
    for (const occ of occupantsByParish.values()) {
      if (occ.length >= 2 && !occ.some(effectiveInCharge)) return true;
    }
    return false;
  }, [occupantsByParish, effectiveInCharge]);

  // --- mutations ---

  // Rewrite the drafts array with the given clergy moved to the given
  // parishId (null = pool). The provider's setter applies auto-in-charge.
  const moveClergy = useCallback((clergyId: number, toParishId: number | null) => {
    const next = pastorDrafts.filter((d) => d.clergyId !== clergyId);
    if (toParishId !== null) {
      next.push({
        clergyId,
        toLevel: "Parish",
        toLevelId: toParishId,
        // Auto-in-charge in the provider's setter will fix this up.
        isInCharge: false,
      });
    }
    setPastorDrafts(next);
  }, [pastorDrafts, setPastorDrafts]);

  // Manual in-charge override — flip the chosen clergy's flag and clear the
  // others in the same parish. Materialises drafts for every clergy in the
  // parish (otherwise canonical-only entries wouldn't pick up isInCharge).
  const pickInCharge = useCallback((parishId: number, winnerClergyId: number) => {
    const inParish = clergy.filter((c) => effectiveParish(c) === parishId);
    const next: TransferDraft[] = pastorDrafts
      .filter((d) => !(d.toLevel === "Parish" && d.toLevelId === parishId))
      .map((d) => ({ ...d }));
    for (const c of inParish) {
      next.push({
        clergyId: c.clergyId,
        toLevel: "Parish",
        toLevelId: parishId,
        isInCharge: c.clergyId === winnerClergyId,
      });
    }
    setPastorDrafts(next);
  }, [clergy, effectiveParish, pastorDrafts, setPastorDrafts]);

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    const cid = clergyIdFromDraggable(id);
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
    if (target.parishId !== null && !PARISH_RANKS.has(moved.rankLabel)) return;
    if (effectiveParish(moved) === target.parishId) return;
    moveClergy(moved.clergyId, target.parishId);
  };

  const unassignAll = () => {
    if (!window.confirm(
      "Move every Pastor and Archdeacon to the unassigned pool? You can still drag them back before submitting.",
    )) return;
    setPastorDrafts([]);
  };

  const onRestore = () => {
    if (!window.confirm(
      "Discard your pastor + LC draft and reload the canonical assignments from the server?",
    )) return;
    restore();
  };

  // --- render ---

  if (loadingBoard) {
    return (
      <div className="container mx-auto px-6 py-6 text-gray-500">Loading parishes…</div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 space-y-4">
      <header className="flex flex-wrap items-baseline gap-3 justify-between">
        <div>
          <h1 className="text-xl font-bold">Pastors &amp; Archdeacons</h1>
          <p className="text-xs text-gray-600">
            Drag clergy between parishes. Drops auto-save. Pick the in-charge
            when a parish ends up with two or more clergy.
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
            href="/transfers/lc"
            aria-disabled={anyParishNeedsLead}
            onClick={(e) => { if (anyParishNeedsLead) e.preventDefault(); }}
            className={`text-sm px-3 py-1.5 rounded ${anyParishNeedsLead
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-red-600 text-white hover:bg-red-700"}`}
            title={anyParishNeedsLead ? "Resolve in-charge picks before moving on" : ""}
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
              parishes.map((p) => {
                const occ = (occupantsByParish.get(p.parishId) ?? []).filter(matches);
                return (
                  <ParishZone
                    key={p.parishId}
                    parish={p}
                    occupants={occ}
                    activeRank={activeRank}
                    computeInCharge={effectiveInCharge}
                    onChipClick={(_c, parishId) => setPickLeadFor(parishId)}
                  />
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
          parishName={parishes.find((p) => p.parishId === pickLeadFor)?.parishName ?? "Parish"}
          occupants={(occupantsByParish.get(pickLeadFor) ?? [])}
          currentInChargeId={inChargeByParish.get(pickLeadFor) ?? null}
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
