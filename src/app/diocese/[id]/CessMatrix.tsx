"use client";

// Year-to-date cess matrix. Rows = local churches, columns = Jan..Dec.
// The first column (LC name + code chip) is sticky on horizontal scroll
// so the operator never loses track of which row they're reading.
//
// The matrix now lives behind a "Cess status" button on the dashboard:
// this component renders the modal shell + the table inside it. Clicking
// a cell pops a second, smaller modal layered above with the per-cell
// drilldown (contribution, monthly target, shortfall, YTD, active
// project count).
//
// Color mapping is keyed to the operator's vocabulary:
//   Verified  → green  "Paid"
//   Submitted → yellow "Partially paid"
//   Rejected  → red    "Not paid"
//   no row    → grey   "Missing"
// Plus: if the contribution amount is less than the LC's monthly
// MonthlyCessAmount target, the cell forces yellow regardless of status.
// "Partial when amount < target" is the only override.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";
import type { CessMonth, Lc } from "./types";
import { formatKes } from "./types";

// ----- color & label maps -----

type ColorKey = "paid" | "partial" | "notPaid" | "missing";

const COLOR_CLASS: Record<ColorKey, string> = {
  paid: "bg-green-300 hover:bg-green-400",
  partial: "bg-yellow-200 hover:bg-yellow-300",
  notPaid: "bg-red-300 hover:bg-red-400",
  missing: "bg-gray-200 hover:bg-gray-300",
};

const COLOR_SWATCH: Record<ColorKey, string> = {
  paid: "bg-green-300",
  partial: "bg-yellow-200",
  notPaid: "bg-red-300",
  missing: "bg-gray-200",
};

const COLOR_LABEL: Record<ColorKey, string> = {
  paid: "Paid",
  partial: "Partially paid",
  notPaid: "Not paid",
  missing: "Missing",
};

// Resolve the cell color from the raw cess status + amount + target.
// Order of precedence:
//   1. No row at all       → missing
//   2. Rejected            → notPaid
//   3. Submitted           → partial (not yet verified)
//   4. Verified + under target → partial (operator override)
//   5. Verified            → paid
function resolveColor(month: CessMonth | undefined, target: number | null): ColorKey {
  if (!month) return "missing";
  if (month.status === "Rejected") return "notPaid";
  if (month.status === "Submitted") return "partial";
  if (month.status === "Verified") {
    if (target != null && month.amount != null && month.amount < target) {
      return "partial";
    }
    return "paid";
  }
  return "missing";
}

// ----- API shapes (local — no need to leak into types.ts) -----

interface LcPublicDetail {
  localChurchId: number;
  monthlyCessAmount: number | null;
}

interface PlanRow {
  id: number;
  title: string;
  status: number; // 1 Draft, 2 Active, 3 Completed, 4 Cancelled
}

const PLAN_STATUS_ACTIVE = 2;

const MONTH_LONG = Array.from({ length: 12 }, (_, i) =>
  new Date(0, i).toLocaleString("en", { month: "long" }),
);

// ----- modal primitives -----

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Tailwind max-w-* class for the panel; full-screen on mobile regardless.
  panelClass: string;
  labelledBy?: string;
}

function Modal({ open, onClose, children, panelClass, labelledBy }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      // Note: the matrix uses z-40 + the drilldown uses z-50 so the smaller
      // modal layers above without dismissing the matrix.
      className="fixed inset-0 bg-black/50 flex items-stretch md:items-center justify-center p-0 md:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div
        className={`bg-white shadow-2xl w-full ${panelClass} flex flex-col md:rounded-xl overflow-hidden max-h-screen md:max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ----- selected cell state -----

interface SelectedCell {
  lc: Lc;
  month: number; // 1..12
  cess: CessMonth | undefined;
}

// ----- main component -----

interface Props {
  localChurches: Lc[];
}

export function CessMatrix({ localChurches }: Props) {
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [selected, setSelected] = useState<SelectedCell | null>(null);

  // Shared monthly-target cache keyed by lcId. Populated lazily as the
  // operator clicks cells. Re-clicks for the same LC won't re-fetch.
  const [targetCache, setTargetCache] = useState<Map<number, number | null>>(
    new Map(),
  );

  const year = new Date().getFullYear();

  // Lock body scroll while the matrix modal is open. The drilldown is
  // small enough to live within the matrix without further locks.
  useEffect(() => {
    if (!matrixOpen && !selected) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [matrixOpen, selected]);

  // YTD total of verified cess across the diocese for the modal footer.
  const ytdVerified = useMemo(
    () =>
      localChurches.reduce((acc, lc) => {
        return (
          acc +
          lc.cessThisYear
            .filter((m) => m.status === "Verified" && m.amount != null)
            .reduce((a, m) => a + (m.amount ?? 0), 0)
        );
      }, 0),
    [localChurches],
  );

  // ----- target fetch (used by the drilldown when a cell is clicked) -----

  const fetchTarget = useCallback(
    async (lcId: number) => {
      if (targetCache.has(lcId)) return;
      const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";
      try {
        const res = await fetch(`${base}/public/local-churches/${lcId}`);
        if (!res.ok) {
          setTargetCache((m) => new Map(m).set(lcId, null));
          return;
        }
        const data = (await res.json()) as LcPublicDetail;
        setTargetCache((m) =>
          new Map(m).set(lcId, data.monthlyCessAmount ?? null),
        );
      } catch {
        // Best-effort. Show "Not set" rather than blocking.
        setTargetCache((m) => new Map(m).set(lcId, null));
      }
    },
    [targetCache],
  );

  useEffect(() => {
    if (!selected) return;
    void fetchTarget(selected.lc.localChurchId);
  }, [selected, fetchTarget]);

  return (
    <section>
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-2 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Cess this year
        </h2>
        <button
          type="button"
          onClick={() => setMatrixOpen(true)}
          className="inline-flex items-center gap-2 bg-white hover:bg-red-50 text-red-800 font-semibold text-sm px-4 py-2 rounded border border-red-200 shadow-sm transition"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Cess status
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Open the cess matrix to review every local church&apos;s monthly
        contribution status for {year}.
      </p>

      {/* ===== Matrix modal ===== */}
      <Modal
        open={matrixOpen}
        onClose={() => {
          // Don't close the matrix while the drilldown is open — let the
          // drilldown's own close handler dismiss itself first.
          if (selected) return;
          setMatrixOpen(false);
        }}
        panelClass="md:max-w-6xl"
        labelledBy="cess-matrix-title"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3
              id="cess-matrix-title"
              className="text-lg font-semibold text-gray-900"
            >
              Cess matrix · {year}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Click any cell for the per-month drilldown.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMatrixOpen(false)}
            aria-label="Close cess matrix"
            className="text-gray-400 hover:text-gray-700 rounded-full w-9 h-9 flex items-center justify-center hover:bg-gray-100"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 px-6 py-3 border-b border-gray-100 bg-gray-50">
          {(Object.keys(COLOR_LABEL) as ColorKey[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span
                className={`inline-block w-3 h-3 rounded ${COLOR_SWATCH[k]}`}
              />
              {COLOR_LABEL[k]}
            </span>
          ))}
        </div>

        {/* Table body */}
        <div className="flex-1 overflow-auto">
          {localChurches.length === 0 ? (
            <p className="text-sm text-gray-400 italic p-6">
              No local churches yet.
            </p>
          ) : (
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 sticky top-0 z-10">
                <tr>
                  <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left font-semibold border-b border-gray-200 min-w-[14rem]">
                    Local Church
                  </th>
                  {Array.from({ length: 12 }, (_, i) => (
                    <th
                      key={i}
                      className="px-2 py-3 text-center font-semibold w-10 border-b border-gray-200"
                    >
                      {new Date(0, i).toLocaleString("en", { month: "short" })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {localChurches.map((lc, rowIdx) => {
                  const target = targetCache.get(lc.localChurchId) ?? null;
                  return (
                    <tr
                      key={lc.localChurchId}
                      className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                    >
                      <td
                        className={`sticky left-0 z-10 px-4 py-2 border-b border-gray-100 ${
                          rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                        }`}
                      >
                        <Link
                          href={`/lc/${lc.localChurchId}`}
                          className="text-red-800 hover:underline font-medium"
                        >
                          {lc.localChurchName}
                        </Link>
                        {lc.localChurchCode && (
                          <span className="ml-2 text-[10px] tracking-wide uppercase bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-semibold">
                            {lc.localChurchCode}
                          </span>
                        )}
                        <div className="text-xs text-gray-500 mt-0.5">
                          {lc.parishName}
                        </div>
                      </td>
                      {Array.from({ length: 12 }, (_, i) => {
                        const m = i + 1;
                        const month = lc.cessThisYear.find(
                          (x) => x.periodMonth === m,
                        );
                        // Forced-yellow override only applies when the
                        // target is known in cache — otherwise we render
                        // status-only and let the drilldown reveal the
                        // true target. Most operators will have clicked
                        // around enough by their second visit that the
                        // cache is warm.
                        const color = resolveColor(month, target);
                        const tooltipParts: string[] = [COLOR_LABEL[color]];
                        if (month?.amount != null) {
                          tooltipParts.push(formatKes(month.amount));
                        }
                        if (month?.paymentReference) {
                          tooltipParts.push(`Ref: ${month.paymentReference}`);
                        }
                        return (
                          <td
                            key={i}
                            className="px-1 py-2 text-center border-b border-gray-100"
                          >
                            <button
                              type="button"
                              title={tooltipParts.join(" · ")}
                              aria-label={`${lc.localChurchName} ${MONTH_LONG[i]}: ${COLOR_LABEL[color]}`}
                              onClick={() =>
                                setSelected({ lc, month: m, cess: month })
                              }
                              className={`block w-6 h-6 rounded mx-auto cursor-pointer transition ${COLOR_CLASS[color]}`}
                            >
                              <span className="sr-only">
                                {COLOR_LABEL[color]}
                              </span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* YTD summary footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm">
          <span className="text-gray-600">Year-to-date verified cess</span>
          <span className="font-bold text-red-900">
            {formatKes(ytdVerified)}
          </span>
        </div>
      </Modal>

      {/* ===== Drilldown modal (layered on top of the matrix) ===== */}
      {selected && (
        <CellDrilldown
          selected={selected}
          year={year}
          target={targetCache.get(selected.lc.localChurchId) ?? null}
          targetLoaded={targetCache.has(selected.lc.localChurchId)}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

// ============================================================
// Cell drilldown
// ============================================================

interface DrilldownProps {
  selected: SelectedCell;
  year: number;
  target: number | null;
  targetLoaded: boolean;
  onClose: () => void;
}

function CellDrilldown({
  selected,
  year,
  target,
  targetLoaded,
  onClose,
}: DrilldownProps) {
  const { lc, month, cess } = selected;
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [activeProjects, setActiveProjects] = useState<number | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Lazy fetch of /Lc/{id}/Plans → filter to status === Active. Swallow
  // 403 / network errors quietly per spec. Don't refetch while the
  // drilldown is open for the same LC — the state resets when `selected`
  // changes because this component unmounts/remounts.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) return;
      setProjectsLoading(true);
      try {
        const rows = await apiFetch<PlanRow[]>(
          `/Lc/${lc.localChurchId}/Plans`,
          token,
        );
        if (cancelled) return;
        const n = rows.filter((r) => r.status === PLAN_STATUS_ACTIVE).length;
        setActiveProjects(n);
      } catch {
        // 403 or network — render nothing for this block.
        if (!cancelled) setActiveProjects(null);
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [lc.localChurchId, token]);

  // ---- derived ----

  const contributed = cess?.amount ?? null;
  const monthName = MONTH_LONG[month - 1];

  // YTD contributed across all rows in this year, up to the selected
  // month inclusive. The overview only ever returns the current year's
  // rows, so cessThisYear acts as the year scope.
  const ytdContributed = lc.cessThisYear
    .filter((m) => m.periodMonth <= month && m.amount != null)
    .reduce((a, m) => a + (m.amount ?? 0), 0);

  // YTD target = monthly target × months elapsed including the selected.
  const ytdTarget = target != null ? target * month : null;
  const ytdShortfall = ytdTarget != null ? ytdTarget - ytdContributed : null;

  // Per-month shortfall — only computable when target is known + we have
  // an amount (Missing months still show "Not paid yet" rather than a
  // shortfall number, by leaving contributed as null).
  const shortfall =
    target != null && contributed != null ? target - contributed : null;

  return (
    <Modal
      open={true}
      onClose={onClose}
      panelClass="md:max-w-md"
      labelledBy="cess-drilldown-title"
    >
      <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
        <div className="min-w-0">
          <h3
            id="cess-drilldown-title"
            className="text-lg font-semibold text-gray-900 truncate"
          >
            {lc.localChurchName}
            {lc.localChurchCode && (
              <span className="ml-2 text-[10px] tracking-wide uppercase bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-semibold align-middle">
                {lc.localChurchCode}
              </span>
            )}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {monthName} {year}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close drilldown"
          className="text-gray-400 hover:text-gray-700 rounded-full w-9 h-9 flex items-center justify-center hover:bg-gray-100 shrink-0"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="6" y1="18" x2="18" y2="6" />
          </svg>
        </button>
      </div>

      <div className="px-6 py-5 space-y-5 overflow-y-auto">
        {/* This month */}
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Contributed this month" value={formatKes(contributed)} />
          <Stat
            label="Monthly target"
            value={
              !targetLoaded
                ? "…"
                : target == null
                  ? "Not set"
                  : formatKes(target)
            }
          />
        </div>

        {/* Shortfall — only when both numbers exist. */}
        {target != null && contributed != null && shortfall != null && (
          <ShortfallLine shortfall={shortfall} />
        )}

        {target == null && targetLoaded && (
          <p className="text-xs text-gray-500 italic">
            Monthly target not configured for this LC — shortfall hidden.
          </p>
        )}

        {/* YTD block */}
        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
            Year-to-date (Jan – {monthName})
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="YTD contributed" value={formatKes(ytdContributed)} />
            <Stat
              label="YTD target"
              value={ytdTarget == null ? "Not set" : formatKes(ytdTarget)}
            />
          </div>
          {ytdShortfall != null && (
            <ShortfallLine shortfall={ytdShortfall} subtle />
          )}
        </div>

        {/* More metrics block. Active projects via /Lc/{id}/Plans. */}
        <div className="rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1.5">
            More metrics
          </p>
          {projectsLoading ? (
            <p className="text-sm text-gray-400">Loading projects…</p>
          ) : activeProjects == null ? (
            <p className="text-sm text-gray-400">Projects unavailable.</p>
          ) : (
            <p className="text-sm text-gray-800">
              <span className="font-semibold">{activeProjects}</span>{" "}
              <span className="text-gray-600">
                active project{activeProjects === 1 ? "" : "s"}
              </span>
            </p>
          )}
        </div>

        {cess?.paymentReference && (
          <p className="text-xs text-gray-500">
            Payment ref:{" "}
            <span className="font-mono text-gray-700">
              {cess.paymentReference}
            </span>
          </p>
        )}
      </div>

      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <Link
          href={`/lc/${lc.localChurchId}`}
          className="text-sm text-red-800 hover:underline font-medium"
        >
          Open LC →
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}

// ----- small UI helpers -----

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
        {label}
      </p>
      <p className="text-base font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

// Coloured shortfall summary. Positive = under target (red), zero = on
// target (green), negative = over target (green w/ overpaid copy).
function ShortfallLine({
  shortfall,
  subtle = false,
}: {
  shortfall: number;
  subtle?: boolean;
}) {
  const onOrOver = shortfall <= 0;
  const labelClasses = onOrOver
    ? "text-green-700 bg-green-50 border-green-200"
    : "text-red-700 bg-red-50 border-red-200";

  let text: string;
  if (shortfall > 0) {
    text = `Shortfall: ${formatKes(shortfall)}`;
  } else if (shortfall === 0) {
    text = "Fully paid";
  } else {
    text = `Overpaid by ${formatKes(Math.abs(shortfall))}`;
  }

  return (
    <div
      className={`flex items-center gap-2 text-sm border rounded px-3 py-2 ${labelClasses} ${
        subtle ? "text-xs py-1.5" : ""
      }`}
    >
      {onOrOver && (
        <svg
          className={`shrink-0 ${subtle ? "w-3.5 h-3.5" : "w-4 h-4"}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="5 12 10 17 19 7" />
        </svg>
      )}
      <span className="font-semibold">{text}</span>
    </div>
  );
}
