"use client";

// Shared state for the three-step transfers wizard. Holds the server-side
// draft (Pastor + LC moves + review fields) and exposes mutators that
// optimistically update local state and debounce a PUT back to
// /Bishop/diocese/{id}/transfer-drafts/*. See the design spec for the
// auto-in-charge rules applied inside the setters.
//
// One provider per diocese. The bishop-OID scoping lives on the backend —
// each authenticated bishop sees their own draft row.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

const DEFAULT_DIOCESE_ID = Number(process.env.NEXT_PUBLIC_DEFAULT_DIOCESE_ID ?? "1");

// Ranks the wizard touches. Bishop appears for completeness (we may surface
// the bishop-in-charge toggle elsewhere) but the two boards only act on
// Pastor / ArchDeacon (page 1) and Deacon / ChurchLeader (page 2).
export type Rank =
  | "Bishop"
  | "Pastor"
  | "ArchDeacon"
  | "Deacon"
  | "ChurchLeader"
  | "Evangelist";

export type Level = "Diocese" | "Parish" | "LocalChurch";

// Clergy as the board sees them. Each clergy is rendered once, in the slot
// determined by their draft (if any) or their canonical assignment.
export interface ClergyOnBoard {
  clergyId: number;
  name: string;
  salutation: string;
  rankLabel: Rank;
  photoUrl: string | null;
  ordinationDate: string | null;       // ISO date for "first-assigned" tie-breaker
  currentLevel: Level;
  currentLevelId: number;
  // Canonical in-charge status from the server. Lets the pages keep the
  // current lead anchored when the bishop drags a new clergy into an
  // already-led parish — new arrivals never displace an existing lead.
  currentIsInCharge: boolean;
}

// Server contract for a single staged move. Matches the
// PUT /transfer-drafts/{pastors|lcs} body shape.
export interface TransferDraft {
  clergyId: number;
  toLevel: Level;
  toLevelId: number;
  isInCharge: boolean;
}

export interface WizardDraftDto {
  id: number;
  dioceseId: number;
  pastorDrafts: TransferDraft[];
  lcDrafts: TransferDraft[];
  effectiveDate: string | null;
  applyImmediately: boolean;
  ccList: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Ctx {
  dioceseId: number;
  loading: boolean;
  error: string | null;
  pastorDrafts: TransferDraft[];
  lcDrafts: TransferDraft[];
  effectiveDate: string | null;
  applyImmediately: boolean;
  ccList: string;
  setPastorDrafts(d: TransferDraft[]): void;
  setLcDrafts(d: TransferDraft[]): void;
  setReview(p: {
    effectiveDate?: string | null;
    applyImmediately?: boolean;
    ccList?: string;
  }): void;
  restore(): Promise<void>;
}

const WizardContext = createContext<Ctx | null>(null);

export function useWizard(): Ctx {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within a WizardProvider");
  return ctx;
}

// Defensive normalisation for drafts loaded off the server. Older
// backend builds (pre-JsonStringEnumConverter) saved toLevel as the
// integer enum value (e.g. 2 for Parish). The current backend stores
// it as the string ("Parish"). Coerce here so a stale draft in the
// DB doesn't 400 every subsequent PUT.
const LEVEL_BY_INT: Record<number, Level> = {
  1: "LocalChurch",
  2: "Parish",
  3: "Diocese",
};

function normaliseDraft(d: TransferDraft): TransferDraft {
  const tl = d.toLevel as unknown;
  if (typeof tl === "number") {
    const asString = LEVEL_BY_INT[tl] ?? "Parish";
    return { ...d, toLevel: asString };
  }
  return d;
}

// --- provider ---

interface ProviderProps {
  children: ReactNode;
  // Optional override for tests / future multi-diocese mode. Falls back to
  // the env-default diocese (single-diocese deploy today).
  dioceseId?: number;
}

// Shared clergy meta cache. Page 1 + Page 2 both populate this from their
// own data fetches so the auto-in-charge logic can read ranks + ordination
// without re-fetching. Stored in a ref so updates don't trigger re-renders.
const clergyMetaCache = new Map<number, ClergyOnBoard>();

// Each board page calls this when it loads its clergy roster — keeps the
// auto-in-charge tie-breaker aware of ordination dates + ranks even though
// the context itself never fetches clergy directly.
export function registerClergyMeta(rows: ClergyOnBoard[]) {
  for (const r of rows) clergyMetaCache.set(r.clergyId, r);
}

export function WizardProvider({ children, dioceseId }: ProviderProps) {
  const dId = dioceseId ?? DEFAULT_DIOCESE_ID;
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pastorDrafts, setPastorDraftsState] = useState<TransferDraft[]>([]);
  const [lcDrafts, setLcDraftsState] = useState<TransferDraft[]>([]);
  const [effectiveDate, setEffectiveDate] = useState<string | null>(null);
  const [applyImmediately, setApplyImmediately] = useState(true);
  const [ccList, setCcList] = useState("");

  // Debounce timers for the auto-save PUTs. Each setter cancels its own
  // pending timer + schedules a fresh one. 1 s matches the spec.
  const pastorSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lcSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reviewSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Token ref lets the debounced callbacks read the latest token without
  // re-creating the setters on every session refresh.
  const tokenRef = useRef<string | undefined>(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  const loadDraft = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const d = await apiFetch<WizardDraftDto>(
        `/Bishop/diocese/${dId}/transfer-drafts`,
        token,
      );
      setPastorDraftsState(Array.isArray(d.pastorDrafts) ? d.pastorDrafts.map(normaliseDraft) : []);
      setLcDraftsState(Array.isArray(d.lcDrafts) ? d.lcDrafts.map(normaliseDraft) : []);
      setEffectiveDate(d.effectiveDate ?? null);
      setApplyImmediately(d.applyImmediately ?? true);
      setCcList(d.ccList ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [token, dId]);

  useEffect(() => { loadDraft(); }, [loadDraft]);

  const setPastorDrafts = useCallback((next: TransferDraft[]) => {
    // The auto-in-charge rule used to live here, but it couldn't see
    // canonical state — so dragging a clergy into a parish that ALREADY
    // had a canonical lead would silently re-elect the newcomer. The
    // page owns the rule now: callers pass the drafts they want stored.
    const cloned = next.map((d) => ({ ...d }));
    setPastorDraftsState(cloned);

    if (pastorSaveTimer.current) clearTimeout(pastorSaveTimer.current);
    pastorSaveTimer.current = setTimeout(async () => {
      const t = tokenRef.current;
      if (!t) return;
      try {
        await apiFetch(
          `/Bishop/diocese/${dId}/transfer-drafts/pastors`,
          t,
          { method: "PUT", json: { drafts: cloned } },
        );
        setError(null);
      } catch (e: unknown) {
        setError(e instanceof Error
          ? `Couldn't save: ${e.message}`
          : "Couldn't save your changes.");
      }
    }, 1000);
  }, [dId]);

  const setLcDrafts = useCallback((next: TransferDraft[]) => {
    const cloned = next.map((d) => ({ ...d }));
    setLcDraftsState(cloned);

    if (lcSaveTimer.current) clearTimeout(lcSaveTimer.current);
    lcSaveTimer.current = setTimeout(async () => {
      const t = tokenRef.current;
      if (!t) return;
      try {
        await apiFetch(
          `/Bishop/diocese/${dId}/transfer-drafts/lcs`,
          t,
          { method: "PUT", json: { drafts: cloned } },
        );
        setError(null);
      } catch (e: unknown) {
        setError(e instanceof Error
          ? `Couldn't save: ${e.message}`
          : "Couldn't save your changes.");
      }
    }, 1000);
  }, [dId]);

  const setReview = useCallback((p: {
    effectiveDate?: string | null;
    applyImmediately?: boolean;
    ccList?: string;
  }) => {
    if (p.effectiveDate !== undefined) setEffectiveDate(p.effectiveDate);
    if (p.applyImmediately !== undefined) setApplyImmediately(p.applyImmediately);
    if (p.ccList !== undefined) setCcList(p.ccList);

    if (reviewSaveTimer.current) clearTimeout(reviewSaveTimer.current);
    reviewSaveTimer.current = setTimeout(async () => {
      const t = tokenRef.current;
      if (!t) return;
      try {
        // Read the latest values via the functional setters so the PUT
        // always reflects what the user just typed. We capture them
        // synchronously here by pulling from the closure variables (set
        // above just before the setTimeout schedules).
        const body = {
          effectiveDate: p.effectiveDate !== undefined ? p.effectiveDate : effectiveDate,
          applyImmediately: p.applyImmediately !== undefined ? p.applyImmediately : applyImmediately,
          ccList: p.ccList !== undefined ? p.ccList : ccList,
        };
        await apiFetch(
          `/Bishop/diocese/${dId}/transfer-drafts/review`,
          t,
          { method: "PUT", json: body },
        );
        setError(null);
      } catch (e: unknown) {
        setError(e instanceof Error
          ? `Couldn't save: ${e.message}`
          : "Couldn't save your changes.");
      }
    }, 1000);
  }, [dId, effectiveDate, applyImmediately, ccList]);

  const restore = useCallback(async () => {
    if (!token) return;
    try {
      await apiFetch(`/Bishop/diocese/${dId}/transfer-drafts`, token, {
        method: "DELETE",
      });
      await loadDraft();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [token, dId, loadDraft]);

  // Clean up any in-flight timers on unmount so we don't fire a stale PUT
  // after the provider tears down.
  useEffect(() => {
    return () => {
      if (pastorSaveTimer.current) clearTimeout(pastorSaveTimer.current);
      if (lcSaveTimer.current) clearTimeout(lcSaveTimer.current);
      if (reviewSaveTimer.current) clearTimeout(reviewSaveTimer.current);
    };
  }, []);

  const value = useMemo<Ctx>(() => ({
    dioceseId: dId,
    loading,
    error,
    pastorDrafts,
    lcDrafts,
    effectiveDate,
    applyImmediately,
    ccList,
    setPastorDrafts,
    setLcDrafts,
    setReview,
    restore,
  }), [
    dId, loading, error, pastorDrafts, lcDrafts, effectiveDate, applyImmediately,
    ccList, setPastorDrafts, setLcDrafts, setReview, restore,
  ]);

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}
