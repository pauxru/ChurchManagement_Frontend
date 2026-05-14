"use client";

// LC Finances — ledger view. Every FinanceRecord is either an Inflow or an
// Outflow; the table shows them in two columns and computes a running balance
// for the selected month in the footer.

import { useCallback, useEffect, useMemo, useState } from "react";
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
    <div className="container mx-auto px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Finance ledger</h2>
          <p className="text-sm text-gray-500 mt-1">
            Track inflows and outflows. The running balance below is calculated for the selected month.
          </p>
        </div>
        <button
          onClick={() => {
            setForm(initialForm());
            setShowModal(true);
          }}
          className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-md shadow-sm text-sm font-medium"
        >
          + Add transaction
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded mb-4 text-sm flex justify-between gap-2">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900 font-bold">×</button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 mb-4 p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Period:</span>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border border-gray-300 px-3 py-1.5 rounded-md text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
        >
          {MONTH_NAMES.map((name, i) => (
            <option key={i} value={i + 1}>{name}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-300 px-3 py-1.5 rounded-md text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
        >
          {yearChoices.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <div className="ml-auto flex flex-wrap gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100">
            <span className="font-medium">Inflows:</span> KES {formatKes(totals.inflow)}
          </div>
          <div className="px-3 py-1.5 rounded-md bg-rose-50 text-rose-800 ring-1 ring-rose-100">
            <span className="font-medium">Outflows:</span> KES {formatKes(totals.outflow)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Description</th>
              <th className="text-left px-4 py-3 font-medium">Category</th>
              <th className="text-right px-4 py-3 font-medium">Inflow (KES)</th>
              <th className="text-right px-4 py-3 font-medium">Outflow (KES)</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-10">
                  No transactions for {MONTH_NAMES[month - 1]} {year}.
                </td>
              </tr>
            ) : (
              sortedRows.map((r) => {
                const isOut = r.direction === DIRECTION_OUTFLOW;
                return (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{r.date}</td>
                    <td className="px-4 py-2.5 text-gray-800">{r.description || <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {CATEGORY_LABEL[r.category] ?? "—"}
                      </span>
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${isOut ? "text-gray-300" : "text-emerald-700 font-medium"}`}>
                      {isOut ? "" : formatKes(r.amount)}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${isOut ? "text-rose-700 font-medium" : "text-gray-300"}`}>
                      {isOut ? formatKes(r.amount) : ""}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              <td colSpan={3} className="px-4 py-3 text-right text-xs uppercase tracking-wide font-semibold text-gray-600">
                Totals for {MONTH_NAMES[month - 1]} {year}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-700">
                {formatKes(totals.inflow)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-rose-700">
                {formatKes(totals.outflow)}
              </td>
            </tr>
            <tr className="bg-gray-900">
              <td colSpan={3} className="px-4 py-4 text-right text-sm uppercase tracking-wider font-semibold text-gray-300">
                Running balance
              </td>
              <td
                colSpan={2}
                className={`px-4 py-4 text-right text-2xl font-bold tabular-nums ${
                  totals.balance < 0 ? "text-rose-400" : "text-emerald-300"
                }`}
              >
                KES {formatKes(totals.balance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => !saving && setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Add transaction</h3>
              <p className="text-xs text-gray-500 mt-1">Record an inflow (income) or outflow (expense).</p>
            </div>
            <div className="p-6 space-y-4">
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
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="px-4 py-2 rounded-md text-sm border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.amount}
                className="px-4 py-2 rounded-md text-sm bg-red-700 hover:bg-red-800 text-white disabled:opacity-50"
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
