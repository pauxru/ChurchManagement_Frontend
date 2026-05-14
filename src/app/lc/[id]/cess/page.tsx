"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

// Backend enum values (Models/Enums.cs)
//   CessStatus      : Submitted=1, Verified=2, Rejected=3
//   PaymentChannel  : MPesa=1, BankTransfer=2, Cash=3, Other=4
// We only let the user pick "Bank Deposit" (=BankTransfer=2) for now; the
// backend still accepts any channel, so MPesa/Cash submissions from
// elsewhere will continue to render correctly.

interface Cess {
  id: number;
  periodYear: number;
  periodMonth: number;
  amount: number;
  currency: string;
  paymentReference: string;
  paymentDate: string;
  paymentChannel: number;
  status: number;
  rejectionReason: number | null;
  rejectionNote: string | null;
  notes: string | null;
}

interface LcDetail {
  localChurchId: number;
  localChurchName: string;
  localChurchCode: string | null;
  parishName: string | null;
  dioceseName: string | null;
  monthlyCessAmount: number | null;
}

const STATUS_LABEL: Record<number, string> = { 1: "Submitted", 2: "Verified", 3: "Rejected" };
const CHANNEL_LABEL: Record<number, string> = { 1: "M-Pesa", 2: "Bank Deposit", 3: "Cash", 4: "Other" };
const MONTH_LABELS = Array.from({ length: 12 }, (_, i) =>
  new Date(0, i).toLocaleString("en", { month: "long" })
);

// PaymentChannel.BankTransfer
const BANK_DEPOSIT = 2;

// Hardcoded diocese banking details. The operator will edit this block
// directly when they finalise the account; nothing else depends on it.
const PAYMENT_TARGET = {
  payee: "AIPCA Gatundu Diocese",
  bank: "Equity Bank",
  branch: "Gatundu Branch",
  accountNumber: "0100123456789",
  accountName: "AIPCA Gatundu Diocese",
  swiftCode: "EQBLKENA",
};

function formatKes(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

function statusBadgeClasses(status: number): string {
  if (status === 2) return "bg-green-100 text-green-800 border border-green-200";
  if (status === 3) return "bg-red-100 text-red-800 border border-red-200";
  return "bg-yellow-100 text-yellow-800 border border-yellow-200";
}

export default function CessPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [list, setList] = useState<Cess[]>([]);
  const [lc, setLc] = useState<LcDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [amount, setAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => now.toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  // LC info — anonymous-accessible, so we don't need a token.
  useEffect(() => {
    if (!lcId) return;
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";
    fetch(`${base}/public/local-churches/${lcId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: LcDetail | null) => { if (d) setLc(d); })
      .catch(() => { /* header just won't render; not fatal */ });
  }, [lcId]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setList(await apiFetch<Cess[]>(`/Lc/${lcId}/Cess`, token));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [lcId, token]);

  useEffect(() => { refresh(); }, [refresh]);

  const amountNumber = Number(amount);
  const hasAmount = amount !== "" && !Number.isNaN(amountNumber) && amountNumber > 0;
  const target = lc?.monthlyCessAmount ?? null;
  const balance = hasAmount && target != null ? amountNumber - target : null;

  async function submit() {
    if (!token) return;
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      await apiFetch(`/Lc/${lcId}/Cess`, token, {
        method: "POST",
        json: {
          periodYear,
          periodMonth,
          amount: amountNumber,
          currency: "KES",
          paymentReference,
          paymentDate,
          paymentChannel: BANK_DEPOSIT,
          notes: notes || null,
        },
      });
      setAmount("");
      setPaymentReference("");
      setNotes("");
      setSuccessMsg(`Cess for ${MONTH_LABELS[periodMonth - 1]} ${periodYear} submitted.`);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = hasAmount && paymentReference.trim().length > 0 && !submitting;

  // Year range for the period selector — current year ± 1.
  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="container mx-auto px-6 py-6 max-w-5xl space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold text-red-900">Cess submissions</h1>
          {lc && (
            <p className="text-sm text-gray-600">
              {lc.localChurchName}
              {lc.parishName && <> · {lc.parishName.replace(/\s+Parish$/i, "")} Parish</>}
              {lc.dioceseName && <> · {lc.dioceseName.replace(/\s+Diocese$/i, "")} Diocese</>}
            </p>
          )}
        </div>
      </div>

      {/* 1. Diocese payment-target info card — first, before the date selector. */}
      <section className="bg-blue-50 border border-blue-200 rounded-lg p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-blue-900">Pay cess to</h2>
            <p className="text-xs text-blue-700/80 mt-0.5">
              Deposit the monthly cess into this account, then record the slip below.
            </p>
          </div>
          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-semibold">
            Bank deposit only
          </span>
        </div>
        <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-blue-700/70 text-xs uppercase tracking-wide">Payee</dt>
            <dd className="font-semibold text-blue-950">{PAYMENT_TARGET.payee}</dd>
          </div>
          <div>
            <dt className="text-blue-700/70 text-xs uppercase tracking-wide">Bank</dt>
            <dd className="font-semibold text-blue-950">{PAYMENT_TARGET.bank}</dd>
          </div>
          <div>
            <dt className="text-blue-700/70 text-xs uppercase tracking-wide">Account name</dt>
            <dd className="font-semibold text-blue-950">{PAYMENT_TARGET.accountName}</dd>
          </div>
          <div>
            <dt className="text-blue-700/70 text-xs uppercase tracking-wide">Account number</dt>
            <dd className="font-mono font-semibold text-blue-950">{PAYMENT_TARGET.accountNumber}</dd>
          </div>
          <div>
            <dt className="text-blue-700/70 text-xs uppercase tracking-wide">Branch</dt>
            <dd className="font-semibold text-blue-950">{PAYMENT_TARGET.branch}</dd>
          </div>
          <div>
            <dt className="text-blue-700/70 text-xs uppercase tracking-wide">SWIFT</dt>
            <dd className="font-mono font-semibold text-blue-950">{PAYMENT_TARGET.swiftCode}</dd>
          </div>
        </dl>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-3 py-2 rounded text-sm">
          {successMsg}
        </div>
      )}

      {/* 2-5. Submission form. */}
      <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 space-y-5">
        <h2 className="text-lg font-bold text-red-900">Record a cess payment</h2>

        {/* Month being paid for */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">
            Month being paid for <span className="text-red-700">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Which monthly cess obligation is this payment for?
          </p>
          <div className="flex gap-2">
            <select
              value={periodMonth}
              onChange={(e) => setPeriodMonth(Number(e.target.value))}
              className="border border-gray-300 rounded px-3 py-2 w-44"
            >
              {MONTH_LABELS.map((label, i) => (
                <option key={i + 1} value={i + 1}>{label}</option>
              ))}
            </select>
            <select
              value={periodYear}
              onChange={(e) => setPeriodYear(Number(e.target.value))}
              className="border border-gray-300 rounded px-3 py-2 w-28"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount + live balance vs monthly target */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">
            Amount paid (KES) <span className="text-red-700">*</span>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 25000"
              className="border border-gray-300 rounded px-3 py-2 w-48"
            />
            <div className="text-sm text-gray-700">
              <span className="text-gray-500">Monthly target:</span>{" "}
              <span className="font-semibold">
                {target == null ? "—" : formatKes(target)}
              </span>
            </div>
          </div>
          <div className="mt-2 text-sm">
            {target == null && (
              <span className="text-gray-500 italic">No monthly target set</span>
            )}
            {target != null && !hasAmount && (
              <span className="text-gray-500">
                Enter an amount to compare against the target.
              </span>
            )}
            {target != null && hasAmount && balance != null && balance >= 0 && (
              <span className="text-green-700 font-semibold">
                + {formatKes(balance)} above expected
              </span>
            )}
            {target != null && hasAmount && balance != null && balance < 0 && (
              <span className="text-red-700 font-semibold">
                − {formatKes(Math.abs(balance))} short of expected
              </span>
            )}
          </div>
        </div>

        {/* Payment date — when the money actually moved */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">
            Payment date <span className="text-red-700">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">
            The date the money actually left the church account.
          </p>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          />
        </div>

        {/* Method of payment — fixed to Bank Deposit */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">Method of payment</label>
          <div className="inline-flex items-center gap-2 border border-gray-300 bg-gray-50 rounded px-3 py-2 text-sm text-gray-700">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-600" />
            <span className="font-medium">Bank Deposit</span>
            <span className="text-gray-500">(only option for now)</span>
          </div>
        </div>

        {/* Reference (bank slip number) */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">
            Payment reference <span className="text-red-700">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Bank slip / deposit reference number — the diocese will use this to match the deposit.
          </p>
          <input
            type="text"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="e.g. EQTY-DEP-998877"
            className="border border-gray-300 rounded px-3 py-2 w-full max-w-md font-mono"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">Notes (optional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything the diocese should know about this payment."
            className="border border-gray-300 rounded px-3 py-2 w-full"
          />
        </div>

        <div className="pt-2">
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="bg-red-700 hover:bg-red-800 text-white px-5 py-2 rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting…" : "Submit cess payment"}
          </button>
        </div>
      </section>

      {/* 6. Prior submissions */}
      <section className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-red-900">Prior submissions</h2>
          <p className="text-xs text-gray-500">Most recent first.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-4 py-2">Month</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Payment date</th>
              <th className="px-4 py-2">Reference</th>
              <th className="px-4 py-2">Method</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No cess submissions yet.
                </td>
              </tr>
            )}
            {list.map((c) => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  <span className="font-semibold">{MONTH_LABELS[c.periodMonth - 1]}</span>{" "}
                  <span className="text-gray-500">{c.periodYear}</span>
                </td>
                <td className="px-4 py-2 font-medium">
                  {c.currency} {c.amount.toLocaleString()}
                </td>
                <td className="px-4 py-2">{c.paymentDate}</td>
                <td className="px-4 py-2 font-mono text-xs">{c.paymentReference}</td>
                <td className="px-4 py-2">{CHANNEL_LABEL[c.paymentChannel] ?? "—"}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadgeClasses(c.status)}`}>
                    {STATUS_LABEL[c.status] ?? "Unknown"}
                  </span>
                  {c.status === 3 && c.rejectionNote && (
                    <div className="text-xs text-red-700 mt-1">{c.rejectionNote}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
