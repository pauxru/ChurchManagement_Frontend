"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

interface Cess {
  id: number; periodYear: number; periodMonth: number; amount: number; currency: string;
  paymentReference: string; paymentDate: string; paymentChannel: number; status: number;
  rejectionReason: number | null; rejectionNote: string | null;
}

const STATUS = { 1: "Submitted", 2: "Verified", 3: "Rejected" } as Record<number, string>;
const CHANNEL = { 1: "MPesa", 2: "Bank", 3: "Cash", 4: "Other" } as Record<number, string>;

export default function CessPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [list, setList] = useState<Cess[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const now = new Date();
  const [periodYear, setPeriodYear] = useState(now.getFullYear());
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [amount, setAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(now.toISOString().slice(0, 10));
  const [paymentChannel, setPaymentChannel] = useState(1);
  const [notes, setNotes] = useState("");

  const refresh = useCallback(async () => {
    if (!token) return;
    try { setList(await apiFetch<Cess[]>(`/Lc/${lcId}/Cess`, token)); }
    catch (e) { setError((e as Error).message); }
  }, [lcId, token]);
  useEffect(() => { refresh(); }, [refresh]);

  async function submit() {
    if (!token) return;
    setError(null);
    try {
      await apiFetch(`/Lc/${lcId}/Cess`, token, {
        method: "POST",
        json: { periodYear, periodMonth, amount: Number(amount), currency: "KES", paymentReference, paymentDate, paymentChannel, notes },
      });
      setAmount(""); setPaymentReference(""); setNotes(""); setShowForm(false);
      refresh();
    } catch (e) { setError((e as Error).message); }
  }

  async function verify(id: number) {
    if (!token) return;
    try { await apiFetch(`/Lc/${lcId}/Cess/${id}/verify`, token, { method: "POST" }); refresh(); }
    catch (e) { setError((e as Error).message); }
  }

  async function reject(id: number) {
    if (!token) return;
    const reason = prompt("Reason code (1=AmountMismatch, 2=ReferenceNotFound, 3=WrongPeriod, 4=Duplicate, 5=Other):");
    if (!reason) return;
    const note = prompt("Optional note:");
    try { await apiFetch(`/Lc/${lcId}/Cess/${id}/reject`, token, { method: "POST", json: { reasonCode: Number(reason), note } }); refresh(); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold">Cess submissions</h2>
        <button onClick={() => setShowForm((s) => !s)} className="bg-blue-700 text-white px-4 py-2 rounded">
          {showForm ? "Cancel" : "Submit cess"}
        </button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded mb-3">{error}</div>}
      {showForm && (
        <div className="bg-white shadow rounded p-4 mb-4 space-y-2">
          <div className="flex gap-2">
            <input type="number" value={periodYear} onChange={(e) => setPeriodYear(Number(e.target.value))} className="border px-3 py-2 rounded w-24" />
            <select value={periodMonth} onChange={(e) => setPeriodMonth(Number(e.target.value))} className="border px-3 py-2 rounded">
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("en", { month: "long" })}</option>)}
            </select>
            <input type="number" placeholder="Amount KES" value={amount} onChange={(e) => setAmount(e.target.value)} className="border px-3 py-2 rounded flex-1" />
          </div>
          <input type="text" placeholder="Payment reference (M-Pesa code / bank ref)" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className="w-full border px-3 py-2 rounded" />
          <div className="flex gap-2">
            <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="border px-3 py-2 rounded" />
            <select value={paymentChannel} onChange={(e) => setPaymentChannel(Number(e.target.value))} className="border px-3 py-2 rounded">
              <option value={1}>M-Pesa</option><option value={2}>Bank</option><option value={3}>Cash</option><option value={4}>Other</option>
            </select>
          </div>
          <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border px-3 py-2 rounded" rows={2} />
          <button onClick={submit} disabled={!amount || !paymentReference} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">Submit</button>
        </div>
      )}
      <table className="w-full bg-white shadow rounded">
        <thead className="bg-gray-100 text-sm text-left">
          <tr>
            <th className="p-2">Period</th><th className="p-2">Amount</th><th className="p-2">Ref</th>
            <th className="p-2">Date</th><th className="p-2">Channel</th><th className="p-2">Status</th><th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-gray-500">No submissions yet.</td></tr>}
          {list.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-2">{c.periodYear}-{String(c.periodMonth).padStart(2, "0")}</td>
              <td className="p-2">{c.currency} {c.amount.toLocaleString()}</td>
              <td className="p-2 font-mono text-sm">{c.paymentReference}</td>
              <td className="p-2">{c.paymentDate}</td>
              <td className="p-2">{CHANNEL[c.paymentChannel]}</td>
              <td className="p-2">
                <span className={`px-2 py-1 rounded text-xs ${c.status === 2 ? "bg-green-100 text-green-800" : c.status === 3 ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
                  {STATUS[c.status]}
                </span>
                {c.rejectionNote && <div className="text-xs text-red-700 mt-1">{c.rejectionNote}</div>}
              </td>
              <td className="p-2 text-sm">
                {c.status === 1 && (
                  <>
                    <button onClick={() => verify(c.id)} className="text-green-700 underline mr-2">Verify</button>
                    <button onClick={() => reject(c.id)} className="text-red-700 underline">Reject</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
