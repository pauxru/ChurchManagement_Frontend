"use client";

// Year-to-date cess matrix. Rows = local churches, columns = Jan..Dec.
// The first column (LC name + code chip) is sticky on horizontal scroll
// so the operator never loses track of which row they're reading.
//
// The matrix now lives behind a "Cess status" section card on the
// dashboard. That card surfaces the four status counts inline alongside
// a primary CTA. This component renders:
//   1. The section card (title + status counts + open button).
//   2. The matrix modal with parish groupings, parish totals rows,
//      a diocese-wide totals row, and clickable status filter chips.
//   3. The per-cell drilldown modal layered above the matrix.
//
// Color mapping is keyed to the operator's vocabulary:
//   Verified  → green  "Paid"
//   Submitted → yellow "Partially paid"
//   Rejected  → red    "Not paid"
//   no row    → grey   "Missing"
// Plus: if the contribution amount is less than the LC's monthly
// MonthlyCessAmount target, the cell forces yellow regardless of status.
// "Partial when amount < target" is the only override.
//
// Parish / Diocese rollup rules (applied per month across the group):
//   ALL Verified                            → paid (green)
//   ANY Rejected                            → notPaid (red)
//   ANY Submitted OR ANY amount < target    → partial (yellow)
//   ALL Missing                             → missing (grey)

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

const COLOR_CHIP_BORDER: Record<ColorKey, string> = {
  paid: "border-green-400",
  partial: "border-yellow-400",
  notPaid: "border-red-400",
  missing: "border-gray-400",
};

const COLOR_LABEL: Record<ColorKey, string> = {
  paid: "Paid",
  partial: "Partially paid",
  notPaid: "Not paid",
  missing: "Missing",
};

// Short labels for the inline summary line on the section card.
const COLOR_LABEL_SHORT: Record<ColorKey, string> = {
  paid: "paid",
  partial: "partial",
  notPaid: "not paid",
  missing: "missing",
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

// Roll up a group of (cell color, raw month, target) tuples to a single
// color following the parish / diocese aggregation rules.
function resolveRollupColor(
  cells: Array<{ color: ColorKey }>,
): ColorKey {
  if (cells.length === 0) return "missing";
  let hasRejected = false;
  let hasPartial = false;
  let hasPaid = false;
  let hasMissing = false;
  for (const c of cells) {
    if (c.color === "notPaid") hasRejected = true;
    else if (c.color === "partial") hasPartial = true;
    else if (c.color === "paid") hasPaid = true;
    else if (c.color === "missing") hasMissing = true;
  }
  if (hasRejected) return "notPaid";
  if (hasPartial) return "partial";
  if (hasPaid && !hasMissing) return "paid";
  if (hasPaid && hasMissing) return "partial";
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
  const [statusFilter, setStatusFilter] = useState<ColorKey | null>(null);

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

  // ----- grouping by parish (alphabetical) -----
  // Each parish group has its LCs sorted alphabetically too.
  const parishGroups = useMemo(() => {
    const buckets = new Map<string, Lc[]>();
    for (const lc of localChurches) {
      const key = lc.parishName ?? "";
      const existing = buckets.get(key);
      if (existing) existing.push(lc);
      else buckets.set(key, [lc]);
    }
    return Array.from(buckets.entries())
      .map(([parishName, lcs]) => ({
        parishName,
        lcs: [...lcs].sort((a, b) =>
          a.localChurchName.localeCompare(b.localChurchName),
        ),
      }))
      .sort((a, b) => a.parishName.localeCompare(b.parishName));
  }, [localChurches]);

  // ----- per-cell color cache (used for header counts + filter dimming) -----
  // Computed for every LC × month with the (cached or null) target. Stays
  // reactive to targetCache changes so cells stay in sync as caches warm.
  const cellColorMap = useMemo(() => {
    const map = new Map<string, ColorKey>(); // key = `${lcId}:${month}`
    for (const lc of localChurches) {
      const target = targetCache.get(lc.localChurchId) ?? null;
      for (let m = 1; m <= 12; m++) {
        const month = lc.cessThisYear.find((x) => x.periodMonth === m);
        map.set(`${lc.localChurchId}:${m}`, resolveColor(month, target));
      }
    }
    return map;
  }, [localChurches, targetCache]);

  // Diocese-wide status counts (LC-month cells) for the section card +
  // status header chips inside the modal.
  const statusCounts = useMemo(() => {
    const counts: Record<ColorKey, number> = {
      paid: 0,
      partial: 0,
      notPaid: 0,
      missing: 0,
    };
    cellColorMap.forEach((color) => {
      counts[color] += 1;
    });
    return counts;
  }, [cellColorMap]);

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

  // Reset filter when matrix closes so it doesn't carry over.
  useEffect(() => {
    if (!matrixOpen) setStatusFilter(null);
  }, [matrixOpen]);

  // ----- aggregation helpers (per month, given a set of LCs) -----
  function aggregateMonth(lcs: Lc[], m: number) {
    let verifiedAmount = 0;
    let targetAmount = 0;
    let targetKnown = true;
    let nVerified = 0;
    let nSubmitted = 0;
    let nMissing = 0;
    let nRejected = 0;
    const colorCells: Array<{ color: ColorKey }> = [];
    for (const lc of lcs) {
      const month = lc.cessThisYear.find((x) => x.periodMonth === m);
      const color = cellColorMap.get(`${lc.localChurchId}:${m}`) ?? "missing";
      colorCells.push({ color });
      if (month?.status === "Verified" && month.amount != null) {
        verifiedAmount += month.amount;
        nVerified += 1;
      } else if (month?.status === "Submitted") {
        nSubmitted += 1;
      } else if (month?.status === "Rejected") {
        nRejected += 1;
      } else {
        nMissing += 1;
      }
      const t = targetCache.get(lc.localChurchId);
      if (t == null) {
        targetKnown = false;
      } else {
        targetAmount += t;
      }
    }
    const color = resolveRollupColor(colorCells);
    return {
      color,
      verifiedAmount,
      targetAmount,
      targetKnown,
      nVerified,
      nSubmitted,
      nMissing,
      nRejected,
      total: lcs.length,
    };
  }

  return (
    <section>
      {/* ===== Section card — promoted from a single small button ===== */}
      <div className="border border-gray-200 rounded-lg shadow-sm bg-white p-5 mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900">Cess status</h2>
          <p className="text-sm text-gray-600 mt-1">
            <StatusInlineSummary counts={statusCounts} />
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMatrixOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-red-800 hover:bg-red-900 text-white font-semibold text-sm px-5 py-2.5 rounded shadow-sm transition shrink-0"
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
          Open cess matrix
          <span aria-hidden="true">→</span>
        </button>
      </div>

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

        {/* Status overview chips (clickable filters) */}
        <div className="px-6 py-3 border-b border-gray-100 bg-white flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mr-1">
            Status overview
          </span>
          {(Object.keys(COLOR_LABEL) as ColorKey[]).map((k) => {
            const active = statusFilter === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() =>
                  setStatusFilter((cur) => (cur === k ? null : k))
                }
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full border px-2.5 py-1 transition ${
                  COLOR_SWATCH[k]
                } ${COLOR_CHIP_BORDER[k]} ${
                  active
                    ? "ring-2 ring-offset-1 ring-gray-700"
                    : "hover:brightness-95"
                } text-gray-800`}
              >
                <span className="tabular-nums">{statusCounts[k]}</span>
                <span>{COLOR_LABEL[k]}</span>
              </button>
            );
          })}
          {statusFilter != null && (
            <button
              type="button"
              onClick={() => setStatusFilter(null)}
              className="ml-auto text-xs text-red-800 font-semibold hover:underline"
            >
              Clear filter
            </button>
          )}
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
                {parishGroups.map((group) => (
                  <ParishGroupRows
                    key={group.parishName || "(no parish)"}
                    parishName={group.parishName}
                    lcs={group.lcs}
                    statusFilter={statusFilter}
                    cellColorMap={cellColorMap}
                    aggregateMonth={aggregateMonth}
                    onCellClick={(lc, m, cess) =>
                      setSelected({ lc, month: m, cess })
                    }
                  />
                ))}

                {/* Diocese totals row */}
                <DioceseTotalsRow
                  lcs={localChurches}
                  aggregateMonth={aggregateMonth}
                  statusFilter={statusFilter}
                />
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
// Inline summary line on the section card.
// e.g. "142 paid · 18 partial · 5 not paid · 35 missing"
// ============================================================
function StatusInlineSummary({
  counts,
}: {
  counts: Record<ColorKey, number>;
}) {
  const order: ColorKey[] = ["paid", "partial", "notPaid", "missing"];
  return (
    <span className="text-sm text-gray-600">
      {order.map((k, i) => (
        <span key={k}>
          {i > 0 && <span className="text-gray-400 mx-1.5">·</span>}
          <span className="font-semibold text-gray-800 tabular-nums">
            {counts[k]}
          </span>{" "}
          {COLOR_LABEL_SHORT[k]}
        </span>
      ))}
    </span>
  );
}

// ============================================================
// Parish group: header row + LC rows + parish totals row.
// ============================================================

interface ParishGroupRowsProps {
  parishName: string;
  lcs: Lc[];
  statusFilter: ColorKey | null;
  cellColorMap: Map<string, ColorKey>;
  aggregateMonth: (lcs: Lc[], m: number) => {
    color: ColorKey;
    verifiedAmount: number;
    targetAmount: number;
    targetKnown: boolean;
    nVerified: number;
    nSubmitted: number;
    nMissing: number;
    nRejected: number;
    total: number;
  };
  onCellClick: (lc: Lc, m: number, cess: CessMonth | undefined) => void;
}

function ParishGroupRows({
  parishName,
  lcs,
  statusFilter,
  cellColorMap,
  aggregateMonth,
  onCellClick,
}: ParishGroupRowsProps) {
  return (
    <>
      {/* Parish header */}
      <tr className="bg-red-50/60">
        <td
          colSpan={13}
          className="sticky left-0 z-10 bg-red-50/60 px-4 py-2 border-b border-red-100 text-xs font-bold uppercase tracking-wide text-red-900"
        >
          {parishName || "(No parish)"}
          <span className="ml-2 font-normal text-gray-500 normal-case tracking-normal">
            {lcs.length} local church{lcs.length === 1 ? "" : "es"}
          </span>
        </td>
      </tr>

      {/* LC rows */}
      {lcs.map((lc, rowIdx) => {
        const rowBg = rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50";
        return (
          <tr key={lc.localChurchId} className={rowBg}>
            <td
              className={`sticky left-0 z-10 px-4 py-2 border-b border-gray-100 ${rowBg}`}
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
              const month = lc.cessThisYear.find((x) => x.periodMonth === m);
              const color =
                cellColorMap.get(`${lc.localChurchId}:${m}`) ?? "missing";
              const tooltipParts: string[] = [COLOR_LABEL[color]];
              if (month?.amount != null) {
                tooltipParts.push(formatKes(month.amount));
              }
              if (month?.paymentReference) {
                tooltipParts.push(`Ref: ${month.paymentReference}`);
              }
              const dimmed =
                statusFilter != null && statusFilter !== color;
              return (
                <td
                  key={i}
                  className="px-1 py-2 text-center border-b border-gray-100"
                >
                  <button
                    type="button"
                    title={tooltipParts.join(" · ")}
                    aria-label={`${lc.localChurchName} ${MONTH_LONG[i]}: ${COLOR_LABEL[color]}`}
                    onClick={() => {
                      if (dimmed) return;
                      onCellClick(lc, m, month);
                    }}
                    disabled={dimmed}
                    className={`block w-6 h-6 rounded mx-auto transition ${
                      COLOR_CLASS[color]
                    } ${
                      dimmed
                        ? "opacity-30 cursor-not-allowed pointer-events-none"
                        : "cursor-pointer"
                    }`}
                  >
                    <span className="sr-only">{COLOR_LABEL[color]}</span>
                  </button>
                </td>
              );
            })}
          </tr>
        );
      })}

      {/* Parish totals row */}
      <tr className="bg-red-50/30">
        <td className="sticky left-0 z-10 bg-red-50/30 px-4 py-2 border-b border-red-100 text-xs font-semibold uppercase tracking-wide text-red-900">
          {parishName || "(No parish)"} totals
        </td>
        {Array.from({ length: 12 }, (_, i) => {
          const m = i + 1;
          const agg = aggregateMonth(lcs, m);
          const dimmed = statusFilter != null && statusFilter !== agg.color;
          const tooltipTargetPart =
            agg.targetKnown && agg.targetAmount > 0
              ? ` / ${formatKes(agg.targetAmount)} target`
              : "";
          const tooltip = `${formatKes(agg.verifiedAmount)}${tooltipTargetPart} · ${agg.nVerified} verified, ${agg.nSubmitted} submitted, ${agg.nMissing + agg.nRejected} missing`;
          return (
            <td
              key={i}
              className="px-1 py-2 text-center border-b border-red-100"
            >
              <span
                title={tooltip}
                aria-label={`${parishName} ${MONTH_LONG[i]} totals: ${tooltip}`}
                className={`block w-6 h-6 rounded mx-auto ${
                  COLOR_SWATCH[agg.color]
                } ${
                  dimmed ? "opacity-30" : ""
                } ring-1 ring-inset ring-red-200`}
              >
                <span className="sr-only">
                  {COLOR_LABEL[agg.color]} — {tooltip}
                </span>
              </span>
            </td>
          );
        })}
      </tr>
    </>
  );
}

// ============================================================
// Diocese totals row — full-width aggregate across all LCs.
// ============================================================

interface DioceseTotalsRowProps {
  lcs: Lc[];
  aggregateMonth: ParishGroupRowsProps["aggregateMonth"];
  statusFilter: ColorKey | null;
}

function DioceseTotalsRow({
  lcs,
  aggregateMonth,
  statusFilter,
}: DioceseTotalsRowProps) {
  return (
    <tr className="bg-red-100/60">
      <td className="sticky left-0 z-10 bg-red-100/60 px-4 py-3 border-t-2 border-b border-red-200 text-xs font-bold uppercase tracking-wide text-red-900">
        Diocese totals
        <span className="ml-2 font-normal text-gray-600 normal-case tracking-normal">
          {lcs.length} local church{lcs.length === 1 ? "" : "es"}
        </span>
      </td>
      {Array.from({ length: 12 }, (_, i) => {
        const m = i + 1;
        const agg = aggregateMonth(lcs, m);
        const dimmed = statusFilter != null && statusFilter !== agg.color;
        const tooltip = `${formatKes(agg.verifiedAmount)} across ${agg.total} church${agg.total === 1 ? "" : "es"}`;
        return (
          <td
            key={i}
            className="px-1 py-3 text-center border-t-2 border-b border-red-200"
          >
            <span
              title={tooltip}
              aria-label={`Diocese ${MONTH_LONG[i]} totals: ${tooltip}`}
              className={`block w-6 h-6 rounded mx-auto ${
                COLOR_SWATCH[agg.color]
              } ${
                dimmed ? "opacity-30" : ""
              } ring-1 ring-inset ring-red-300`}
            >
              <span className="sr-only">
                {COLOR_LABEL[agg.color]} — {tooltip}
              </span>
            </span>
          </td>
        );
      })}
    </tr>
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
