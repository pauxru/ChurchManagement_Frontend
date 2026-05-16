"use client";

// LC Finances. Every FinanceRecord is either an Inflow or an Outflow; the
// page lists them as a single-column card stack (mobile-first) and computes
// a running balance for the selected month in a sticky footer-style block.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

interface LedgerRow {
  id: number;
  date: string;
  category: number;
  amount: number;
  currency: string;
  description: string | null;
  direction: number; // 1 = Inflow, 2 = Outflow
}

const CATEGORY_LABEL: Record<number, string> = {
  1: "Tithe",
  2: "Offering",
  3: "Project",
  4: "Other",
  5: "Expense",
};

const DIRECTION_INFLOW = 1;
const DIRECTION_OUTFLOW = 2;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatKes(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type FormState = {
  direction: number;
  date: string;
  category: number;
  description: string;
  amount: string;
};

const initialForm = (): FormState => ({
  direction: DIRECTION_INFLOW,
  date: new Date().toISOString().slice(0, 10),
  category: 2, // Offering — sensible default for inflow
  description: "",
  amount: "",
});

export default function FinancesPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setRows(
        await apiFetch<LedgerRow[]>(`/Lc/${lcId}/Finance?year=${year}&month=${month}`, token),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }, [lcId, token, year, month]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totals = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const r of rows) {
      if (r.direction === DIRECTION_OUTFLOW) outflow += Number(r.amount);
      else inflow += Number(r.amount);
    }
    return { inflow, outflow, balance: inflow - outflow };
  }, [rows]);

  // Ledger reads top-to-bottom chronologically for human scanning.
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id),
    [rows],
  );

  async function save() {
    if (!token) return;
    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Amount must be a positive number.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/Lc/${lcId}/Finance`, token, {
        method: "POST",
        json: {
          date: form.date,
          category: form.category,
          amount: amt,
          currency: "KES",
          description: form.description.trim() || null,
          direction: form.direction,
        },
      });
      setForm(initialForm());
      setShowModal(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // Year choices: previous 4 years + current year.
  const yearChoices = useMemo(() => {
    const y = now.getFullYear();
    return [y - 4, y - 3, y - 2, y - 1, y];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container mx-auto px-4 py-4 sm:px-6 sm:py-6 max-w-3xl">
      {/* Header: title + Cess shortcut. Full-width stacking on mobile; row on sm+. */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4 sm:mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Finances</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Track inflows and outflows. The running balance is calculated for the selected month.
          </p>
        </div>
        <Link
          href={`/lc/${lcId}/cess`}
          className="w-full sm:w-auto text-center shrink-0 bg-red-700 hover:bg-red-800 text-white text-sm font-medium px-4 py-2 rounded shadow-sm"
        >
          Cess →
        </Link>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded mb-4 text-sm flex justify-between gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900 font-bold">×</button>
        </div>
      )}

      {/* Period switcher. Selects are full-width on mobile, inline on sm+. */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-4 p-3 sm:p-4">
        <div className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2 sm:mb-0 sm:hidden">
          Period
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <span className="hidden sm:inline text-sm font-medium text-gray-700">Period:</span>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-full sm:w-auto border border-gray-300 px-3 py-2 sm:py-1.5 rounded-md text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full sm:w-auto border border-gray-300 px-3 py-2 sm:py-1.5 rounded-md text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
          >
            {yearChoices.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPI strip: stacks vertically on mobile, 3-col grid from sm:. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
        <div className="px-3 py-3 rounded-md bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100">
          <div className="text-[11px] uppercase tracking-wide font-medium opacity-80">Inflows</div>
          <div className="text-base sm:text-lg font-semibold tabular-nums mt-0.5">
            KES {formatKes(totals.inflow)}
          </div>
        </div>
        <div className="px-3 py-3 rounded-md bg-rose-50 text-rose-800 ring-1 ring-rose-100">
          <div className="text-[11px] uppercase tracking-wide font-medium opacity-80">Outflows</div>
          <div className="text-base sm:text-lg font-semibold tabular-nums mt-0.5">
            KES {formatKes(totals.outflow)}
          </div>
        </div>
        <div
          className={`px-3 py-3 rounded-md ring-1 ${
            totals.balance < 0
              ? "bg-rose-100 text-rose-900 ring-rose-200"
              : "bg-gray-900 text-emerald-300 ring-gray-900"
          }`}
        >
          <div className="text-[11px] uppercase tracking-wide font-medium opacity-80">Balance</div>
          <div className="text-base sm:text-lg font-semibold tabular-nums mt-0.5">
            KES {formatKes(totals.balance)}
          </div>
        </div>
      </div>

      {/* Add buttons. Full-width stacked on mobile; side-by-side on sm+.
          Each pre-fills the modal's direction so users don't have to pick it themselves. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-4">
        <button
          onClick={() => {
            setForm({ ...initialForm(), direction: DIRECTION_INFLOW, category: 2 });
            setShowModal(true);
          }}
          className="w-full text-sm font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-400 px-4 py-3 rounded-md transition shadow-sm"
        >
          + Add inflow
        </button>
        <button
          onClick={() => {
            setForm({ ...initialForm(), direction: DIRECTION_OUTFLOW, category: 5 });
            setShowModal(true);
          }}
          className="w-full text-sm font-medium text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-400 px-4 py-3 rounded-md transition shadow-sm"
        >
          + Add outflow
        </button>
      </div>

      {/* Single-column card list. Each card stacks amount (large, colour-coded)
          over category + description + date. */}
      <div className="space-y-2 mb-4">
        {sortedRows.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 text-center text-gray-500 py-10 px-4 text-sm">
            No transactions for {MONTH_NAMES[month - 1]} {year}.
          </div>
        ) : (
          sortedRows.map((r) => {
            const isOut = r.direction === DIRECTION_OUTFLOW;
            return (
              <div
                key={r.id}
                className={`bg-white rounded-lg shadow-sm border-l-4 ${
                  isOut ? "border-l-rose-500" : "border-l-emerald-500"
                } border-y border-r border-gray-100 px-4 py-3`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
                        {CATEGORY_LABEL[r.category] ?? "—"}
                      </span>
                      <span className={`text-[11px] font-semibold uppercase tracking-wide ${
                        isOut ? "text-rose-600" : "text-emerald-600"
                      }`}>
                        {isOut ? "Outflow" : "Inflow"}
                      </span>
                    </div>
                    {r.description ? (
                      <div className="text-sm text-gray-800 mt-1 break-words">{r.description}</div>
                    ) : (
                      <div className="text-sm text-gray-400 mt-1">No description</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">{r.date}</div>
                  </div>
                  <div
                    className={`text-lg sm:text-xl font-bold tabular-nums whitespace-nowrap ${
                      isOut ? "text-rose-700" : "text-emerald-700"
                    }`}
                  >
                    {isOut ? "−" : "+"} {formatKes(r.amount)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Running balance summary block. Kept large & legible at mobile width. */}
      <div className="bg-gray-900 rounded-lg shadow-sm px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold text-gray-400">
            Totals for {MONTH_NAMES[month - 1]} {year}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Inflows</div>
            <div className="text-sm sm:text-base font-semibold tabular-nums text-emerald-300">
              {formatKes(totals.inflow)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">Outflows</div>
            <div className="text-sm sm:text-base font-semibold tabular-nums text-rose-400">
              {formatKes(totals.outflow)}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-3 flex items-baseline justify-between gap-3">
          <div className="text-xs sm:text-sm uppercase tracking-wider font-semibold text-gray-300">
            Running balance
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold tabular-nums ${
              totals.balance < 0 ? "text-rose-400" : "text-emerald-300"
            }`}
          >
            KES {formatKes(totals.balance)}
          </div>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => !saving && setShowModal(false)}
        >
          <div
            className="bg-white rounded-t-lg sm:rounded-lg shadow-xl w-full max-w-lg max-h-[95vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 sm:px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                {form.direction === DIRECTION_OUTFLOW ? "Add outflow" : "Add inflow"}
              </h3>
              <p className="text-xs text-gray-500 mt-1">Record an inflow (income) or outflow (expense).</p>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`cursor-pointer border-2 rounded-md p-3 text-center text-sm transition ${
                      form.direction === DIRECTION_INFLOW
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 font-medium"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="direction"
                      className="sr-only"
                      checked={form.direction === DIRECTION_INFLOW}
                      onChange={() => setForm({ ...form, direction: DIRECTION_INFLOW, category: form.category === 5 ? 2 : form.category })}
                    />
                    ↓ Inflow (Money in)
                  </label>
                  <label
                    className={`cursor-pointer border-2 rounded-md p-3 text-center text-sm transition ${
                      form.direction === DIRECTION_OUTFLOW
                        ? "border-rose-500 bg-rose-50 text-rose-800 font-medium"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="direction"
                      className="sr-only"
                      checked={form.direction === DIRECTION_OUTFLOW}
                      onChange={() => setForm({ ...form, direction: DIRECTION_OUTFLOW, category: 5 })}
                    />
                    ↑ Outflow (Money out)
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: Number(e.target.value) })}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                  >
                    <option value={1}>Tithe</option>
                    <option value={2}>Offering</option>
                    <option value={3}>Project</option>
                    <option value={4}>Other</option>
                    <option value={5}>Expense</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amount (KES)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                  placeholder="What was this for?"
                />
              </div>
            </div>
            <div className="px-4 sm:px-6 py-4 border-t bg-gray-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2 rounded-md text-sm border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.amount}
                className="w-full sm:w-auto px-4 py-2 rounded-md text-sm bg-red-700 hover:bg-red-800 text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
