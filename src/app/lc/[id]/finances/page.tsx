"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

interface Record_ { id: number; date: string; category: number; amount: number; currency: string; description: string | null; }
const CATEGORY = { 1: "Tithe", 2: "Offering", 3: "Project", 4: "Other" } as Record<number, string>;

export default function FinancesPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [list, setList] = useState<Record_[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(1);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try { setList(await apiFetch<Record_[]>(`/Lc/${lcId}/Finance`, token)); }
    catch (e) { setError((e as Error).message); }
  }, [lcId, token]);
  useEffect(() => { refresh(); }, [refresh]);

  async function save() {
    if (!token) return;
    try {
      await apiFetch(`/Lc/${lcId}/Finance`, token, {
        method: "POST",
        json: { date, category, amount: Number(amount), currency: "KES", description },
      });
      setAmount(""); setDescription(""); refresh();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Finance records</h2>
      <div className="bg-white shadow rounded p-4 mb-4 space-y-2">
        <div className="flex gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border px-3 py-2 rounded" />
          <select value={category} onChange={(e) => setCategory(Number(e.target.value))} className="border px-3 py-2 rounded">
            <option value={1}>Tithe</option><option value={2}>Offering</option><option value={3}>Project</option><option value={4}>Other</option>
          </select>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount KES" className="border px-3 py-2 rounded flex-1" />
        </div>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="w-full border px-3 py-2 rounded" />
        <button onClick={save} disabled={!amount} className="bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50">Add</button>
      </div>
      {error && <div className="text-red-700">{error}</div>}
      <table className="w-full bg-white shadow rounded">
        <thead className="bg-gray-100 text-sm text-left">
          <tr><th className="p-2">Date</th><th className="p-2">Category</th><th className="p-2">Amount</th><th className="p-2">Description</th></tr>
        </thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">No records.</td></tr>}
          {list.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.date}</td><td className="p-2">{CATEGORY[r.category]}</td>
              <td className="p-2">{r.currency} {r.amount.toLocaleString()}</td><td className="p-2">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
