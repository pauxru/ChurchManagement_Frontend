"use client";

// Drag-and-drop transfers board. The bishop arranges clergy across the
// diocese visually; each drop queues a "pending move" without committing
// anything. A single Confirm-all click POSTs the whole batch to
// /Bishop/transfers/batch-confirm — see Phase 3 of the transfers-board
// spec (docs/superpowers/specs/2026-05-16-transfers-board-design.md).
//
// Same-rank moves only. Promotions / demotions still go through the
// legacy form at ?view=manual. Vacancy + multi-occupant flags are
// computed locally each render; nothing is sent to the server until
// Confirm.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
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
import { clergyDisplayName, rankGradient } from "@/lib/clergyDisplay";
import { ConfirmModal } from "./ConfirmModal";

// --- domain types ---

// ClergyRanks values that the board supports moving. PresidingArchbishop /
// ArchBishop sit above the diocese and never appear on a single-diocese
// board, so they're omitted. Strings line up with the C# enum names so we
// can pass them straight through to /batch-confirm.
export type Rank =
  | "Bishop" | "Pastor" | "ArchDeacon"
  | "Deacon" | "ChurchLeader" | "Evangelist";

// Board zones live at three levels. ArchDiocese / National exist in the
// backend but never have drop targets on a Bishop's diocese board.
export type Level = "Diocese" | "Parish" | "LocalChurch";

// Clergy as the board sees them. `current*` is what the server says today;
// `pending*` is the optimistic queue waiting on Confirm. `pendingLevelId`
// being non-null AND different from `currentLevelId` is what counts as a
// real pending change. `pendingLevelId === null && pendingLevel !== null`
// is reserved for the "unassign" intent (drop on the Unassigned rail).
interface ClergyOnBoard {
  clergyId: number;
  name: string;
  salutation: string;
  rank: Rank;
  rankLabel: string;
  photoUrl: string | null;
  isInCharge: boolean;
  currentLevel: Level;
  currentLevelId: number;
  pendingLevel: Level | null;
  pendingLevelId: number | null;
  pendingIsInCharge: boolean | null;
}

interface DropZone {
  id: string;             // canonical id used by useDroppable
  level: Level;
  levelId: number;
  name: string;
  expectedRanks: Rank[];
}

// What the backend's /Clergy/* endpoints return — raw Clergy rows. Mirrors
// Models/Clergy.cs so we can map fields without lossy intermediaries.
interface ClergyApiRow {
  clergyID: number;
  clergyName: string;
  clergyRank: number;        // ClergyRanks enum value
  level: number;             // LeadershipLevels enum value
  levelID: number;
  isInCharge: boolean;
  isActive: boolean;
  photoUrl: string | null;
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

// Mirror of ClergyRanks (1-indexed). Defining inline avoids importing the
// LegacyManualSchedule constants and keeps this file self-contained.
const RANK_NAMES: Record<number, Rank | "ArchBishop" | "PresidingArchbishop"> = {
  1: "Evangelist",
  2: "ChurchLeader",
  3: "Deacon",
  4: "Pastor",
  5: "ArchDeacon",
  6: "Bishop",
  7: "ArchBishop",
  8: "PresidingArchbishop",
};

const LEVEL_NAMES: Record<number, Level | "ArchDiocese" | "National"> = {
  1: "LocalChurch",
  2: "Parish",
  3: "Diocese",
  4: "ArchDiocese",
  5: "National",
};

const SALUTATION_BY_RANK: Record<Rank, string> = {
  Bishop: "Rt Rev",
  ArchDeacon: "Ven",
  Pastor: "Rev",
  Deacon: "Deacon",
  ChurchLeader: "CL",
  Evangelist: "Evg",
};

const PARISH_RANKS: Rank[] = ["Pastor", "ArchDeacon"];
const LC_RANKS: Rank[] = ["Deacon", "ChurchLeader", "Evangelist"];
const DIOCESE_RANKS: Rank[] = ["Bishop"];

function expectedRanksFor(level: Level): Rank[] {
  if (level === "Diocese") return DIOCESE_RANKS;
  if (level === "Parish") return PARISH_RANKS;
  return LC_RANKS;
}

function zoneIdFor(level: Level, levelId: number): string {
  return `zone-${level}-${levelId}`;
}

// Parse a zone droppable id back into its (level, levelId). Returns null
// for the special "unassigned" rail so callers can branch on it.
function parseZoneId(id: string): { level: Level; levelId: number } | "unassigned" | null {
  if (id === "zone-unassigned") return "unassigned";
  const m = /^zone-(Diocese|Parish|LocalChurch)-(\d+)$/.exec(id);
  if (!m) return null;
  return { level: m[1] as Level, levelId: Number(m[2]) };
}

function clergyIdFromDraggable(id: string): number | null {
  const m = /^clergy-(\d+)$/.exec(id);
  if (!m) return null;
  return Number(m[1]);
}

// --- presentational sub-components ---

interface ChipProps {
  c: ClergyOnBoard;
  isDragging?: boolean;
  effectiveInCharge: boolean;
  onPickLead?: () => void;
  showPickLeadHint?: boolean;
}

function ClergyChip({ c, isDragging, effectiveInCharge, onPickLead, showPickLeadHint }: ChipProps) {
  const display = clergyDisplayName(c.name, c.rankLabel, c.salutation);
  const gradient = rankGradient(c.rankLabel);
  return (
    <div
      className={`relative flex items-center gap-2 bg-white border rounded-md px-2 py-1 text-xs shadow-sm
        ${isDragging ? "opacity-50 ring-2 ring-blue-400" : ""}
        ${effectiveInCharge ? "border-yellow-400" : "border-gray-200"}`}
      title={c.rankLabel}
    >
      <span className={`w-6 h-6 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-[10px] font-semibold text-white shrink-0`}>
        {c.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.photoUrl} alt={c.name} className="w-full h-full object-cover rounded-full" />
        ) : (
          c.name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase()
        )}
      </span>
      <span className="truncate max-w-[12rem]">{display}</span>
      {effectiveInCharge && (
        <span className="bg-yellow-100 text-yellow-900 text-[10px] font-semibold px-1.5 py-0.5 rounded">lead</span>
      )}
      {showPickLeadHint && onPickLead && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onPickLead(); }}
          className="ml-auto text-[10px] text-blue-700 hover:underline"
        >
          set lead
        </button>
      )}
    </div>
  );
}

// Draggable wrapper around a ClergyChip. We isolate the dnd-kit wiring
// here so the chip itself stays a pure presentational component.
function DraggableClergy({ c, effectiveInCharge, onPickLead, showPickLeadHint }: {
  c: ClergyOnBoard;
  effectiveInCharge: boolean;
  onPickLead?: () => void;
  showPickLeadHint?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `clergy-${c.clergyId}`,
    data: { rank: c.rank, clergyId: c.clergyId },
  });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
      <ClergyChip
        c={c}
        isDragging={isDragging}
        effectiveInCharge={effectiveInCharge}
        onPickLead={onPickLead}
        showPickLeadHint={showPickLeadHint}
      />
    </div>
  );
}

interface ZoneProps {
  zone: DropZone;
  occupants: ClergyOnBoard[];
  activeRank: Rank | null;        // rank of currently dragged clergy (null = no drag)
  onPickLead: (zone: DropZone) => void;
  computeInCharge: (c: ClergyOnBoard) => boolean;
}

function Zone({ zone, occupants, activeRank, onPickLead, computeInCharge }: ZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: zone.id,
    data: { level: zone.level, levelId: zone.levelId, expectedRanks: zone.expectedRanks },
  });
  // Highlight invalid drop zones during drag.
  const invalidForDrag = activeRank !== null && !zone.expectedRanks.includes(activeRank);
  // Vacancy = no occupant for at least one of the expected ranks.
  const ranksPresent = new Set(occupants.map((o) => o.rank));
  const missing = zone.expectedRanks.filter((r) => !ranksPresent.has(r));
  const isVacant = occupants.length === 0;
  // Multi-occupant requiring a lead pick: 2+ in same rank, none flagged.
  const byRank = new Map<Rank, ClergyOnBoard[]>();
  for (const o of occupants) {
    if (!byRank.has(o.rank)) byRank.set(o.rank, []);
    byRank.get(o.rank)!.push(o);
  }
  const needsLeadPick = Array.from(byRank.values()).some(
    (group) => group.length >= 2 && group.every((c) => !computeInCharge(c)),
  );

  return (
    <div
      ref={setNodeRef}
      className={`rounded-md border p-2 transition-colors
        ${invalidForDrag ? "opacity-30 border-dashed border-gray-300" : ""}
        ${isOver && !invalidForDrag ? "ring-2 ring-blue-400 bg-blue-50" : ""}
        ${needsLeadPick ? "border-yellow-400 bg-yellow-50" : ""}
        ${isVacant ? "border-red-400 bg-red-50" : "border-gray-200 bg-white"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-gray-700">{zone.name}</div>
        <div className="flex items-center gap-1 text-[10px]">
          {missing.length > 0 && missing.map((r) => (
            <span key={r} className="bg-red-100 text-red-900 px-1.5 py-0.5 rounded">No {r}</span>
          ))}
          {needsLeadPick && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onPickLead(zone)}
              className="bg-yellow-200 text-yellow-900 px-1.5 py-0.5 rounded hover:bg-yellow-300"
              title="Two or more same-rank clergy land here — pick the lead"
            >
              Pick lead
            </button>
          )}
        </div>
      </div>
      {occupants.length === 0 ? (
        <div className="text-[11px] text-gray-400 italic px-1 py-2">Drop {zone.expectedRanks.join(" / ")} here</div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {occupants.map((c) => (
            <DraggableClergy
              key={c.clergyId}
              c={c}
              effectiveInCharge={computeInCharge(c)}
              onPickLead={() => onPickLead(zone)}
              showPickLeadHint={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Simple radio-picker popover anchored to the board for lead selection.
// Bound to a single zone — clicking a clergy flips them in-charge and
// clears the flag on all others in the zone.
function PickLeadPopover({
  zone, occupants, onPick, onClose,
}: {
  zone: DropZone;
  occupants: ClergyOnBoard[];
  onPick: (clergyId: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/30 z-40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded shadow-lg p-4 w-80 max-w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold mb-2 text-sm">
          Pick lead for {zone.name}
        </h3>
        <p className="text-xs text-gray-600 mb-3">
          Two or more clergy of the same rank are assigned here. Select the in-charge clergy.
        </p>
        <ul className="space-y-1">
          {occupants.map((c) => (
            <li key={c.clergyId}>
              <button
                type="button"
                onClick={() => onPick(c.clergyId)}
                className="w-full text-left text-sm border rounded px-2 py-1 hover:bg-blue-50"
              >
                {clergyDisplayName(c.name, c.rankLabel, c.salutation)}
                <span className="text-xs text-gray-500"> · {c.rankLabel}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="text-right mt-3">
          <button type="button" onClick={onClose} className="text-xs text-gray-600 hover:underline">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// --- page component ---

export default function Board() {
  const params = useParams<{ id: string }>();
  const dioceseId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [clergy, setClergy] = useState<ClergyOnBoard[]>([]);
  const [parishes, setParishes] = useState<ParishRow[]>([]);
  const [lcs, setLcs] = useState<LcRow[]>([]);
  const [dioceseName, setDioceseName] = useState<string>("");
  const [defaultLetterCc, setDefaultLetterCc] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRank, setActiveRank] = useState<Rank | null>(null);
  const [activeClergy, setActiveClergy] = useState<ClergyOnBoard | null>(null);
  const [search, setSearch] = useState("");
  const [expandedParishes, setExpandedParishes] = useState<Set<number>>(new Set());
  const [pickLeadFor, setPickLeadFor] = useState<DropZone | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // ---- data loading ----

  const reload = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Parishes + LCs come from the authenticated Churches/* endpoints so
      // we get IDs (the public list omits them).
      const [parishRows, lcRows, bishops] = await Promise.all([
        apiFetch<ParishRow[]>(`/Churches/diocese-parishes/${dioceseId}`, token),
        apiFetch<LcRow[]>(`/Churches/diocese/${dioceseId}`, token),
        apiFetch<ClergyApiRow[]>(`/Clergy/diocese/${dioceseId}`, token),
      ]);

      // Pull parish-level + LC-level clergy in parallel. With ~10 parishes
      // and ~50 LCs in a typical diocese this is ~60 reqs — slow on first
      // load but acceptable for a board that loads once and lives for a
      // session.
      const parishClergyLists = await Promise.all(
        parishRows.map((p) => apiFetch<ClergyApiRow[]>(`/Clergy/parish/${p.parishId}`, token)),
      );
      const lcClergyLists = await Promise.all(
        lcRows.map((lc) => apiFetch<ClergyApiRow[]>(`/Clergy/localChurch/${lc.localChurchId}`, token)),
      );

      const all: ClergyApiRow[] = [
        ...bishops,
        ...parishClergyLists.flat(),
        ...lcClergyLists.flat(),
      ];

      // De-dupe (a clergy somehow returned twice would be a backend bug,
      // but we don't want the board to render them twice either).
      const seen = new Set<number>();
      const board: ClergyOnBoard[] = [];
      for (const row of all) {
        if (!row.isActive) continue;
        if (seen.has(row.clergyID)) continue;
        seen.add(row.clergyID);
        const rankName = RANK_NAMES[row.clergyRank];
        const levelName = LEVEL_NAMES[row.level];
        // Skip ranks that can't be moved on this board (Archbishop +
        // PresidingArchbishop). Their level is above the diocese, so
        // they wouldn't fit any zone anyway.
        if (rankName !== "Bishop" && rankName !== "Pastor" && rankName !== "ArchDeacon"
          && rankName !== "Deacon" && rankName !== "ChurchLeader" && rankName !== "Evangelist") {
          continue;
        }
        if (levelName !== "Diocese" && levelName !== "Parish" && levelName !== "LocalChurch") continue;
        board.push({
          clergyId: row.clergyID,
          name: row.clergyName,
          salutation: SALUTATION_BY_RANK[rankName],
          rank: rankName,
          rankLabel: rankName,
          photoUrl: row.photoUrl,
          isInCharge: row.isInCharge,
          currentLevel: levelName,
          currentLevelId: row.levelID,
          pendingLevel: null,
          pendingLevelId: null,
          pendingIsInCharge: null,
        });
      }

      // Diocese name comes from the Bishop overview; fall back to a
      // generic label if the endpoint isn't reachable.
      try {
        const overview = await apiFetch<{ dioceseName: string }>(
          `/Bishop/diocese/${dioceseId}/overview`, token);
        setDioceseName(overview.dioceseName);
      } catch {
        setDioceseName(`Diocese ${dioceseId}`);
      }

      // Settings — the bishop may not have admin perms; treat 403 as
      // "no default CC available" without surfacing the error.
      try {
        const s = await apiFetch<DioceseSettings>(`/Admin/diocese/${dioceseId}/settings`, token);
        setDefaultLetterCc(s.defaultLetterCc ?? "");
      } catch {
        setDefaultLetterCc("");
      }

      setParishes(parishRows);
      setLcs(lcRows);
      setClergy(board);
      // Auto-expand every parish on first load so the board is fully
      // visible (operators expect to see everything before deciding what
      // to drag).
      setExpandedParishes(new Set(parishRows.map((p) => p.parishId)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [token, dioceseId]);

  useEffect(() => { reload(); }, [reload]);

  // ---- derived state ----

  // Effective level + in-charge for a clergy — i.e. what they'd be after
  // the current pending state commits. Used by zone occupancy + lead
  // computations and chip rendering.
  const effectiveLevel = useCallback((c: ClergyOnBoard): { level: Level; levelId: number } | null => {
    // pendingLevelId === null means either "no pending move" OR
    // "unassigned" depending on pendingLevel. We distinguish by checking
    // pendingLevel: when pendingLevel is null we treat as no change;
    // when pendingLevel is set but pendingLevelId is null that's our
    // sentinel for "removed from board" — these clergy aren't drawn into
    // any zone.
    if (c.pendingLevel !== null && c.pendingLevelId === null) return null;
    if (c.pendingLevelId !== null && c.pendingLevel !== null) {
      return { level: c.pendingLevel, levelId: c.pendingLevelId };
    }
    return { level: c.currentLevel, levelId: c.currentLevelId };
  }, []);

  const effectiveInCharge = useCallback((c: ClergyOnBoard): boolean =>
    c.pendingIsInCharge ?? c.isInCharge, []);

  // Zones derived from parishes + LCs.
  const zones = useMemo<DropZone[]>(() => {
    const list: DropZone[] = [];
    list.push({
      id: zoneIdFor("Diocese", dioceseId),
      level: "Diocese",
      levelId: dioceseId,
      name: dioceseName || `Diocese ${dioceseId}`,
      expectedRanks: DIOCESE_RANKS,
    });
    for (const p of parishes) {
      list.push({
        id: zoneIdFor("Parish", p.parishId),
        level: "Parish",
        levelId: p.parishId,
        name: p.parishName,
        expectedRanks: PARISH_RANKS,
      });
    }
    for (const lc of lcs) {
      list.push({
        id: zoneIdFor("LocalChurch", lc.localChurchId),
        level: "LocalChurch",
        levelId: lc.localChurchId,
        name: lc.localChurchName + (lc.localChurchCode ? ` (${lc.localChurchCode})` : ""),
        expectedRanks: LC_RANKS,
      });
    }
    return list;
  }, [parishes, lcs, dioceseId, dioceseName]);

  // Search filter for the chips. Filtering applies to display but doesn't
  // remove a clergy from their slot — instead, non-matching clergy fade.
  const matches = useCallback((c: ClergyOnBoard): boolean => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.rankLabel.toLowerCase().includes(q);
  }, [search]);

  // Map zoneId → occupants. Recomputed each render — cheap, since a
  // diocese has at most a few hundred clergy.
  const occupantsByZone = useMemo(() => {
    const m = new Map<string, ClergyOnBoard[]>();
    for (const c of clergy) {
      const eff = effectiveLevel(c);
      if (!eff) continue;
      const expected = expectedRanksFor(eff.level);
      if (!expected.includes(c.rank)) continue;
      const id = zoneIdFor(eff.level, eff.levelId);
      if (!m.has(id)) m.set(id, []);
      m.get(id)!.push(c);
    }
    return m;
  }, [clergy, effectiveLevel]);

  // Clergy whose pending state moved them off the board (Unassigned).
  const unassignedClergy = useMemo(
    () => clergy.filter((c) => c.pendingLevel !== null && c.pendingLevelId === null),
    [clergy],
  );

  // Pending changes — any clergy where (pendingLevel, pendingLevelId)
  // diverges from (currentLevel, currentLevelId), OR where
  // pendingIsInCharge differs from isInCharge.
  const pendingChanges = useMemo(() => {
    return clergy.filter((c) => {
      const movedSlot = c.pendingLevel !== null &&
        (c.pendingLevel !== c.currentLevel || c.pendingLevelId !== c.currentLevelId);
      const movedLead = c.pendingIsInCharge !== null && c.pendingIsInCharge !== c.isInCharge;
      return movedSlot || movedLead;
    });
  }, [clergy]);

  // Block Confirm-all when any zone has 2+ same-rank occupants with no
  // lead picked (matches the in-charge prompt invariant from the spec).
  const anyZoneNeedsLead = useMemo(() => {
    for (const z of zones) {
      const occ = occupantsByZone.get(z.id) ?? [];
      const byRank = new Map<Rank, ClergyOnBoard[]>();
      for (const c of occ) {
        if (!byRank.has(c.rank)) byRank.set(c.rank, []);
        byRank.get(c.rank)!.push(c);
      }
      for (const group of byRank.values()) {
        if (group.length >= 2 && group.every((c) => !effectiveInCharge(c))) return true;
      }
    }
    return false;
  }, [zones, occupantsByZone, effectiveInCharge]);

  // ---- drag handlers ----

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    const clergyId = clergyIdFromDraggable(id);
    if (clergyId == null) return;
    const c = clergy.find((x) => x.clergyId === clergyId);
    if (!c) return;
    setActiveRank(c.rank);
    setActiveClergy(c);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const activeIdStr = String(e.active.id);
    setActiveRank(null);
    setActiveClergy(null);
    if (!e.over) return;
    const overIdStr = String(e.over.id);
    const cid = clergyIdFromDraggable(activeIdStr);
    if (cid == null) return;
    const moved = clergy.find((c) => c.clergyId === cid);
    if (!moved) return;
    const parsed = parseZoneId(overIdStr);
    if (parsed === null) return;
    if (parsed === "unassigned") {
      const confirmed = window.confirm(
        `Remove ${clergyDisplayName(moved.name, moved.rankLabel, moved.salutation)} from any assignment? ` +
        "Their slot will be left vacant until you drag them onto a new zone.",
      );
      if (!confirmed) return;
      setClergy((prev) => prev.map((c) => c.clergyId === cid ? {
        ...c, pendingLevel: c.currentLevel, pendingLevelId: null, pendingIsInCharge: false,
      } : c));
      return;
    }
    const { level, levelId } = parsed;
    if (!expectedRanksFor(level).includes(moved.rank)) return;
    // Already there? Clear pending if dragging back to current slot.
    if (moved.currentLevel === level && moved.currentLevelId === levelId) {
      setClergy((prev) => prev.map((c) => c.clergyId === cid ? {
        ...c, pendingLevel: null, pendingLevelId: null, pendingIsInCharge: null,
      } : c));
      return;
    }
    setClergy((prev) => prev.map((c) => c.clergyId === cid ? {
      // New slot, no lead set yet. The user will be prompted if 2+ same-rank
      // land here. We deliberately clear pendingIsInCharge so the user makes
      // an explicit lead decision per slot — the prior in-charge flag from
      // the source slot would mislead here.
      ...c, pendingLevel: level, pendingLevelId: levelId, pendingIsInCharge: false,
    } : c));
  };

  // ---- in-charge picker ----

  const pickLead = (clergyId: number) => {
    if (!pickLeadFor) return;
    const z = pickLeadFor;
    setClergy((prev) => {
      // First find all occupants of this zone (using post-pending state),
      // then flip in-charge accordingly.
      const inZone = prev.filter((c) => {
        const eff = c.pendingLevelId !== null && c.pendingLevel !== null
          ? { level: c.pendingLevel, levelId: c.pendingLevelId }
          : (c.pendingLevel !== null && c.pendingLevelId === null
            ? null
            : { level: c.currentLevel, levelId: c.currentLevelId });
        if (!eff) return false;
        return eff.level === z.level && eff.levelId === z.levelId;
      });
      const inZoneIds = new Set(inZone.map((c) => c.clergyId));
      return prev.map((c) => {
        if (!inZoneIds.has(c.clergyId)) return c;
        // Only touch the rank-matching occupants — a parish zone can
        // technically host both Pastor + ArchDeacon, but "lead" applies
        // within a rank group. We set the in-charge flag on the chosen
        // clergy and clear it on others sharing that rank.
        const chosen = prev.find((x) => x.clergyId === clergyId);
        if (!chosen) return c;
        if (c.rank !== chosen.rank) return c;
        return { ...c, pendingIsInCharge: c.clergyId === clergyId };
      });
    });
    setPickLeadFor(null);
  };

  // ---- confirm submit ----

  const onConfirmSubmit = async (opts: {
    applyImmediately: boolean;
    effectiveDate: string;
    ccList: string;
  }) => {
    if (!token) return;
    const drafts = clergy
      .filter((c) => c.pendingLevel !== null && c.pendingLevelId !== null)
      .map((c) => ({
        clergyId: c.clergyId,
        toLevel: c.pendingLevel,
        toLevelId: c.pendingLevelId,
        isInCharge: c.pendingIsInCharge ?? false,
      }));
    if (drafts.length === 0) {
      setConfirmOpen(false);
      return;
    }
    try {
      const result = await apiFetch<{
        batchId: string;
        applied: number;
        scheduled: number;
        skipped: { clergyId: number; reason: string }[];
      }>(`/Bishop/transfers/batch-confirm`, token, {
        method: "POST",
        json: {
          dioceseId,
          applyImmediately: opts.applyImmediately,
          effectiveDate: opts.applyImmediately ? null : opts.effectiveDate,
          ccList: opts.ccList || null,
          drafts,
        },
      });
      setConfirmOpen(false);
      const parts = [
        `${result.applied} applied`,
        `${result.scheduled} scheduled`,
      ];
      if (result.skipped.length > 0) parts.push(`${result.skipped.length} skipped`);
      setToast(parts.join(" · "));
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // ---- render ----

  if (loading) {
    return <div className="container mx-auto px-6 py-6 text-gray-500">Loading board…</div>;
  }

  const dioceseZone = zones.find((z) => z.level === "Diocese");

  return (
    <div className="container mx-auto px-4 py-4 space-y-4">
      <header className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <Link href={`/diocese/${dioceseId}`}
            className="text-sm text-blue-700 hover:underline">&larr; Back to diocese overview</Link>
          <h1 className="text-xl font-bold mt-1">
            Transfers board — {dioceseName || `Diocese ${dioceseId}`}
          </h1>
          <p className="text-xs text-gray-600">
            Drag clergy between slots. Same-rank moves only. Promotions / demotions live in{" "}
            <Link href={`/diocese/${dioceseId}/transfers?view=manual`}
              className="text-blue-700 hover:underline">manual schedule</Link>.
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
          <span className="text-sm text-gray-700">
            <span className="font-semibold">{pendingChanges.length}</span> pending
          </span>
          <button
            type="button"
            disabled={pendingChanges.length === 0 || anyZoneNeedsLead}
            onClick={() => setConfirmOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title={anyZoneNeedsLead ? "Resolve in-charge pick(s) before confirming" : ""}
          >
            Confirm all
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 rounded p-3 text-sm">
          {error}
          <button className="ml-3 underline" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      {toast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded p-3 text-sm">
          {toast}
          <button className="ml-3 underline" onClick={() => setToast(null)}>dismiss</button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        <div className="flex flex-col md:flex-row gap-3 items-start">
          {/* Unassigned rail */}
          <UnassignedRail
            clergy={unassignedClergy}
            activeRank={activeRank}
            matches={matches}
            effectiveInCharge={effectiveInCharge}
          />

          {/* Main area */}
          <div className="flex-1 space-y-3">
            {/* Diocese zone */}
            {dioceseZone && (
              <Zone
                zone={dioceseZone}
                occupants={(occupantsByZone.get(dioceseZone.id) ?? []).filter(matches)}
                activeRank={activeRank}
                onPickLead={(z) => setPickLeadFor(z)}
                computeInCharge={effectiveInCharge}
              />
            )}
            {/* Parishes (each with nested LCs) */}
            {parishes.map((p) => {
              const parishZone = zones.find((z) => z.level === "Parish" && z.levelId === p.parishId)!;
              const childLcs = lcs.filter((lc) => lc.localChurchParishID === p.parishId);
              const isExpanded = expandedParishes.has(p.parishId);
              return (
                <div key={p.parishId} className="bg-gray-50 border border-gray-200 rounded-md p-2">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => setExpandedParishes((prev) => {
                        const next = new Set(prev);
                        if (next.has(p.parishId)) next.delete(p.parishId); else next.add(p.parishId);
                        return next;
                      })}
                      className="text-xs text-gray-600 hover:text-gray-900"
                    >
                      {isExpanded ? "▼" : "▶"} {childLcs.length} LC{childLcs.length === 1 ? "" : "s"}
                    </button>
                  </div>
                  <Zone
                    zone={parishZone}
                    occupants={(occupantsByZone.get(parishZone.id) ?? []).filter(matches)}
                    activeRank={activeRank}
                    onPickLead={(z) => setPickLeadFor(z)}
                    computeInCharge={effectiveInCharge}
                  />
                  {isExpanded && childLcs.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mt-2 ml-4">
                      {childLcs.map((lc) => {
                        const lcZone = zones.find((z) => z.level === "LocalChurch" && z.levelId === lc.localChurchId)!;
                        return (
                          <Zone
                            key={lc.localChurchId}
                            zone={lcZone}
                            occupants={(occupantsByZone.get(lcZone.id) ?? []).filter(matches)}
                            activeRank={activeRank}
                            onPickLead={(z) => setPickLeadFor(z)}
                            computeInCharge={effectiveInCharge}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DragOverlay>
          {activeClergy ? (
            <ClergyChip
              c={activeClergy}
              effectiveInCharge={effectiveInCharge(activeClergy)}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {pendingChanges.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-md p-3">
          <h2 className="text-sm font-semibold mb-2">Pending changes ({pendingChanges.length})</h2>
          <ul className="space-y-1 text-xs text-gray-700">
            {pendingChanges.map((c) => {
              const from = `${c.currentLevel} #${c.currentLevelId}`;
              const to = c.pendingLevelId === null
                ? "(unassigned)"
                : `${c.pendingLevel} #${c.pendingLevelId}`;
              const leadChange = c.pendingIsInCharge !== null && c.pendingIsInCharge !== c.isInCharge
                ? (c.pendingIsInCharge ? " · becomes lead" : " · steps down as lead")
                : "";
              return (
                <li key={c.clergyId} className="flex items-center justify-between gap-2">
                  <span>
                    <span className="font-medium">{clergyDisplayName(c.name, c.rankLabel, c.salutation)}</span>
                    <span className="text-gray-500"> · {from} → {to}{leadChange}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setClergy((prev) => prev.map((x) => x.clergyId === c.clergyId
                      ? { ...x, pendingLevel: null, pendingLevelId: null, pendingIsInCharge: null }
                      : x,
                    ))}
                    className="text-red-700 hover:underline"
                  >
                    undo
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {pickLeadFor && (
        <PickLeadPopover
          zone={pickLeadFor}
          occupants={(occupantsByZone.get(pickLeadFor.id) ?? [])}
          onPick={pickLead}
          onClose={() => setPickLeadFor(null)}
        />
      )}

      {confirmOpen && (
        <ConfirmModal
          dioceseName={dioceseName || `Diocese ${dioceseId}`}
          pendingChanges={pendingChanges.map((c) => ({
            clergyId: c.clergyId,
            name: clergyDisplayName(c.name, c.rankLabel, c.salutation),
            fromLabel: `${c.currentLevel} #${c.currentLevelId}`,
            toLabel: c.pendingLevelId === null
              ? "(unassigned)"
              : `${c.pendingLevel} #${c.pendingLevelId}`,
          }))}
          defaultCcList={defaultLetterCc}
          onCancel={() => setConfirmOpen(false)}
          onSubmit={onConfirmSubmit}
        />
      )}
    </div>
  );
}

// Left-rail unassigned drop zone. Clergy whose pending state removed them
// from any slot land here; dropping any clergy onto this rail flags them
// for an "unassign" pending change (subject to a confirm prompt).
function UnassignedRail({
  clergy, activeRank, matches, effectiveInCharge,
}: {
  clergy: ClergyOnBoard[];
  activeRank: Rank | null;
  matches: (c: ClergyOnBoard) => boolean;
  effectiveInCharge: (c: ClergyOnBoard) => boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: "zone-unassigned" });
  return (
    <aside
      ref={setNodeRef}
      className={`md:w-64 w-full shrink-0 border border-dashed rounded-md p-2 bg-white
        ${activeRank ? "border-gray-400" : "border-gray-200"}
        ${isOver ? "ring-2 ring-blue-400 bg-blue-50" : ""}`}
    >
      <div className="text-xs font-semibold text-gray-700 mb-1">Unassigned</div>
      <p className="text-[11px] text-gray-500 mb-2">
        Drop a clergy here to remove their assignment. Confirm prompts before the change is queued.
      </p>
      <div className="space-y-1">
        {clergy.length === 0 && (
          <div className="text-[11px] text-gray-400 italic">No clergy unassigned.</div>
        )}
        {clergy.filter(matches).map((c) => (
          <DraggableClergy key={c.clergyId} c={c} effectiveInCharge={effectiveInCharge(c)} />
        ))}
      </div>
    </aside>
  );
}
