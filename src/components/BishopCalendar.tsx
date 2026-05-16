"use client";

// Bishop's Sunday visit calendar. Standalone — embed by passing a
// dioceseId; the component handles its own data loading + modal flow.
// Diocese admins create/edit/cancel visits from the diocese dashboard
// (see /diocese/[id]/page.tsx in the dashboard-revamp branch); the same
// component is read-only for callers who lack permission because the
// underlying endpoints return 403 and the chip rendering doesn't depend
// on the user's role.
//
// Renders the next ~12 Sundays as a vertical list on mobile, 4-column
// grid on md:+. Click an empty Sunday to open the create modal pre-filled
// with that date; click a populated cell to edit. Cancelled visits render
// with a strikethrough and a "Cancelled" badge — the reason is the cell's
// title attribute so it surfaces on hover.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

interface VisitRow {
  id: number;
  dioceseId: number;
  bishopClergyId: number | null;
  bishopName: string | null;
  localChurchId: number;
  localChurchName: string | null;
  localChurchCode: string | null;
  parishName: string | null;
  visitDate: string;          // ISO "YYYY-MM-DD"
  purpose: string;
  notes: string | null;
  isCancelled: boolean;
  cancelReason?: string | null;
}

interface LcOption {
  localChurchId: number;
  localChurchName: string;
  localChurchCode: string | null;
  localChurchParishID: number;
}

interface ClergyOption {
  clergyID: number;
  clergyName: string;
  clergyRank: number;     // ClergyRanks enum value
  isActive: boolean;
}

interface DioceseOverview {
  dioceseName: string;
  inChargeBishopClergyId: number | null;
}

// ClergyRanks.Bishop = 6 (see Models/Enums.cs). Hard-coded here so the
// component doesn't pull in the full Board.tsx rank tables.
const BISHOP_RANK = 6;

const WEEKS_AHEAD = 12;

interface Props {
  dioceseId: number;
}

function toIsoDate(d: Date): string {
  // Local-date ISO without the time zone shift that `toISOString()` does
  // — calendars are user-facing, not UTC-anchored.
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function nextSundays(count: number): Date[] {
  const out: Date[] = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  // Walk to the upcoming Sunday (DayOfWeek 0). If today is Sunday we still
  // want today as the first card so a Bishop scheduling Sunday-morning
  // sees an actionable cell.
  const daysToSunday = (7 - start.getDay()) % 7;
  start.setDate(start.getDate() + daysToSunday);
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i * 7);
    out.push(d);
  }
  return out;
}

function formatSunday(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

function isThisWeek(d: Date): boolean {
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff < 7;
}

export default function BishopCalendar({ dioceseId }: Props) {
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [lcs, setLcs] = useState<LcOption[]>([]);
  const [bishops, setBishops] = useState<ClergyOption[]>([]);
  const [defaultBishopId, setDefaultBishopId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState | null>(null);

  const sundays = useMemo(() => nextSundays(WEEKS_AHEAD), []);

  const reload = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const from = toIsoDate(sundays[0]);
      const lastSunday = sundays[sundays.length - 1];
      // Add one day of slack so a visit on the final Sunday is still
      // included (the backend treats `to` as inclusive but we don't want
      // off-by-one risk if the operator picks midweek dates around it).
      const toDay = new Date(lastSunday);
      toDay.setDate(toDay.getDate() + 1);
      const to = toIsoDate(toDay);

      const [v, lcRows, clergyRows, overview] = await Promise.all([
        apiFetch<VisitRow[]>(
          `/Bishop/diocese/${dioceseId}/visits?from=${from}&to=${to}&includeCancelled=true`,
          token,
        ),
        apiFetch<LcOption[]>(`/Churches/diocese/${dioceseId}`, token),
        apiFetch<ClergyOption[]>(`/Clergy/diocese/${dioceseId}`, token),
        apiFetch<DioceseOverview>(`/Bishop/diocese/${dioceseId}/overview`, token)
          .catch(() => ({ dioceseName: `Diocese ${dioceseId}`, inChargeBishopClergyId: null })),
      ]);
      setVisits(v);
      setLcs(lcRows);
      setBishops(clergyRows.filter((c) => c.clergyRank === BISHOP_RANK && c.isActive));
      setDefaultBishopId(overview.inChargeBishopClergyId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [token, dioceseId, sundays]);

  useEffect(() => { reload(); }, [reload]);

  // Index visits by the local-date Y-M-D string so the cell renderer can
  // line up a Sunday with the (possibly multiple) visits scheduled on it.
  const visitsByDate = useMemo(() => {
    const m = new Map<string, VisitRow[]>();
    for (const v of visits) {
      // backend emits "YYYY-MM-DD"
      if (!m.has(v.visitDate)) m.set(v.visitDate, []);
      m.get(v.visitDate)!.push(v);
    }
    return m;
  }, [visits]);

  const handleSubmit = async (state: EditingState) => {
    if (!token) return;
    try {
      const body = {
        visitDate: state.visitDate,
        localChurchId: state.localChurchId,
        bishopClergyId: state.bishopClergyId,
        purpose: state.purpose || "Sunday service",
        notes: state.notes || null,
      };
      if (state.id) {
        await apiFetch(`/Bishop/diocese/${dioceseId}/visits/${state.id}`, token, {
          method: "PUT",
          json: body,
        });
      } else {
        await apiFetch(`/Bishop/diocese/${dioceseId}/visits`, token, {
          method: "POST",
          json: body,
        });
      }
      setEditing(null);
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleCancelVisit = async (id: number, reason: string) => {
    if (!token) return;
    try {
      const url = `/Bishop/diocese/${dioceseId}/visits/${id}`
        + (reason ? `?reason=${encodeURIComponent(reason)}` : "");
      await apiFetch(url, token, { method: "DELETE" });
      setEditing(null);
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-lg font-semibold">Bishop&rsquo;s calendar</h2>
        <p className="text-xs text-gray-600">
          Next {WEEKS_AHEAD} weeks · click any Sunday to plan a visit
        </p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 rounded p-2 text-sm">
          {error}
          <button className="ml-3 underline" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Loading calendar&hellip;</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          {sundays.map((d) => {
            const iso = toIsoDate(d);
            const onThisDay = visitsByDate.get(iso) ?? [];
            return (
              <SundayCell
                key={iso}
                date={d}
                iso={iso}
                visits={onThisDay}
                onCreate={() => setEditing({
                  id: null,
                  visitDate: iso,
                  localChurchId: lcs[0]?.localChurchId ?? 0,
                  bishopClergyId: defaultBishopId,
                  purpose: "Sunday service",
                  notes: "",
                })}
                onEdit={(v) => setEditing({
                  id: v.id,
                  visitDate: v.visitDate,
                  localChurchId: v.localChurchId,
                  bishopClergyId: v.bishopClergyId,
                  purpose: v.purpose,
                  notes: v.notes ?? "",
                  isCancelled: v.isCancelled,
                })}
              />
            );
          })}
        </div>
      )}

      {editing && (
        <VisitModal
          state={editing}
          lcs={lcs}
          bishops={bishops}
          onClose={() => setEditing(null)}
          onSubmit={handleSubmit}
          onCancelVisit={handleCancelVisit}
        />
      )}
    </section>
  );
}

// ----- cells -----

interface SundayCellProps {
  date: Date;
  iso: string;
  visits: VisitRow[];
  onCreate: () => void;
  onEdit: (v: VisitRow) => void;
}

function SundayCell({ date, visits, onCreate, onEdit }: SundayCellProps) {
  const thisWeek = isThisWeek(date);
  const headerText = formatSunday(date);

  if (visits.length === 0) {
    return (
      <button
        type="button"
        onClick={onCreate}
        className="text-left border border-dashed border-gray-300 rounded-md p-2 hover:border-blue-400 hover:bg-blue-50 transition min-h-[88px] flex flex-col"
      >
        <div className="text-xs font-medium text-gray-700">{headerText}</div>
        <div className="text-xs text-blue-700 mt-auto pt-2">+ Schedule visit</div>
      </button>
    );
  }

  return (
    <div className="space-y-1">
      {visits.map((v) => {
        const lcLabel = [v.localChurchName, v.localChurchCode].filter(Boolean).join(" · ");
        const cancelled = v.isCancelled;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onEdit(v)}
            title={cancelled ? (v.cancelReason ?? "Cancelled") : v.notes ?? ""}
            className={`w-full text-left rounded-md p-2 transition border min-h-[88px] flex flex-col
              ${cancelled
                ? "bg-gray-50 border-gray-300 hover:border-gray-400"
                : thisWeek
                  ? "bg-yellow-50 border-yellow-300 hover:border-yellow-400"
                  : "bg-white border-gray-200 hover:border-blue-400"}`}
          >
            <div className="flex items-baseline justify-between gap-1">
              <div className="text-xs font-medium text-gray-700">{headerText}</div>
              {cancelled && (
                <span className="bg-red-100 text-red-800 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                  Cancelled
                </span>
              )}
              {!cancelled && thisWeek && (
                <span className="bg-yellow-200 text-yellow-900 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                  This week
                </span>
              )}
            </div>
            <div className={`text-sm font-semibold mt-0.5 ${cancelled ? "line-through text-gray-500" : ""}`}>
              {v.purpose}
            </div>
            {lcLabel && (
              <div className={`text-xs text-gray-600 truncate ${cancelled ? "line-through" : ""}`}>
                {lcLabel}
              </div>
            )}
            {v.bishopName && (
              <div className={`text-[11px] text-gray-500 truncate ${cancelled ? "line-through" : ""}`}>
                with {v.bishopName}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ----- modal -----

interface EditingState {
  id: number | null;
  visitDate: string;
  localChurchId: number;
  bishopClergyId: number | null;
  purpose: string;
  notes: string;
  isCancelled?: boolean;
}

interface VisitModalProps {
  state: EditingState;
  lcs: LcOption[];
  bishops: ClergyOption[];
  onClose: () => void;
  onSubmit: (state: EditingState) => void;
  onCancelVisit: (id: number, reason: string) => void;
}

function VisitModal({ state, lcs, bishops, onClose, onSubmit, onCancelVisit }: VisitModalProps) {
  const [draft, setDraft] = useState<EditingState>(state);
  const isEdit = draft.id != null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.localChurchId) return;
    onSubmit(draft);
  };

  const cancelVisit = () => {
    if (!draft.id) return;
    const reason = window.prompt("Reason for cancelling this visit?", "") ?? "";
    onCancelVisit(draft.id, reason);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <form
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-4 space-y-3"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h3 className="text-base font-semibold">
          {isEdit ? "Edit visit" : "Schedule visit"}
        </h3>

        <label className="block text-xs">
          <span className="text-gray-700">Date</span>
          <input
            type="date"
            value={draft.visitDate}
            onChange={(e) => setDraft({ ...draft, visitDate: e.target.value })}
            required
            className="mt-1 block w-full border rounded px-2 py-1 text-sm"
          />
        </label>

        <label className="block text-xs">
          <span className="text-gray-700">Local Church</span>
          <select
            value={draft.localChurchId}
            onChange={(e) => setDraft({ ...draft, localChurchId: Number(e.target.value) })}
            required
            className="mt-1 block w-full border rounded px-2 py-1 text-sm"
          >
            <option value={0} disabled>Select an LC&hellip;</option>
            {lcs.map((lc) => (
              <option key={lc.localChurchId} value={lc.localChurchId}>
                {lc.localChurchName}{lc.localChurchCode ? ` (${lc.localChurchCode})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs">
          <span className="text-gray-700">Bishop</span>
          <select
            value={draft.bishopClergyId ?? ""}
            onChange={(e) => setDraft({
              ...draft,
              bishopClergyId: e.target.value === "" ? null : Number(e.target.value),
            })}
            className="mt-1 block w-full border rounded px-2 py-1 text-sm"
          >
            <option value="">(use diocese in-charge)</option>
            {bishops.map((b) => (
              <option key={b.clergyID} value={b.clergyID}>{b.clergyName}</option>
            ))}
          </select>
        </label>

        <label className="block text-xs">
          <span className="text-gray-700">Purpose</span>
          <input
            type="text"
            value={draft.purpose}
            onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
            placeholder="Sunday service"
            className="mt-1 block w-full border rounded px-2 py-1 text-sm"
          />
        </label>

        <label className="block text-xs">
          <span className="text-gray-700">Notes</span>
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            rows={3}
            className="mt-1 block w-full border rounded px-2 py-1 text-sm"
          />
        </label>

        {isEdit && draft.isCancelled && (
          <p className="text-xs text-red-700">This visit is cancelled. Saving will not undo it; create a new visit instead.</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          {isEdit && !draft.isCancelled && (
            <button
              type="button"
              onClick={cancelVisit}
              className="mr-auto text-xs text-red-700 hover:underline"
            >
              Cancel visit
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-600 hover:underline"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={!draft.localChurchId}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
