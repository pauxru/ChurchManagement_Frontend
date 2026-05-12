"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

interface Plan { id: number; title: string; description: string | null; startDate: string; endDate: string | null; status: number; }

const STATUS = { 1: "Draft", 2: "Active", 3: "Completed", 4: "Cancelled" } as Record<number, string>;

export default function PlansPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState(1);

  const refresh = useCallback(async () => {
    if (!token) return;
    try { setPlans(await apiFetch<Plan[]>(`/Lc/${lcId}/Plans`, token)); }
    catch (e) { setError((e as Error).message); }
  }, [lcId, token]);
  useEffect(() => { refresh(); }, [refresh]);

  async function submit() {
    if (!token) return;
    try {
      await apiFetch(`/Lc/${lcId}/Plans`, token, {
        method: "POST",
        json: { title, description, startDate, endDate: endDate || null, status },
      });
      setTitle(""); setDescription(""); setEndDate(""); setStatus(1);
      setShowForm(false);
      refresh();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-semibold">Plans</h2>
        <button onClick={() => setShowForm((s) => !s)} className="bg-blue-700 text-white px-4 py-2 rounded">
          {showForm ? "Cancel" : "New plan"}
        </button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded mb-3">{error}</div>}
      {showForm && (
        <div className="bg-white shadow rounded p-4 mb-4 space-y-2">
          <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border px-3 py-2 rounded" />
          <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border px-3 py-2 rounded" rows={3} />
          <div className="flex gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border px-3 py-2 rounded" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border px-3 py-2 rounded" placeholder="End (optional)" />
            <select value={status} onChange={(e) => setStatus(Number(e.target.value))} className="border px-3 py-2 rounded">
              <option value={1}>Draft</option><option value={2}>Active</option><option value={3}>Completed</option><option value={4}>Cancelled</option>
            </select>
          </div>
          <button onClick={submit} disabled={!title} className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50">Save</button>
        </div>
      )}
      <ul className="space-y-2">
        {plans.length === 0 && <li className="text-gray-500">No plans yet.</li>}
        {plans.map((p) => (
          <li key={p.id} className="bg-white shadow rounded p-4">
            <div className="flex justify-between">
              <div className="font-medium">{p.title}</div>
              <span className="text-xs bg-gray-200 px-2 py-1 rounded">{STATUS[p.status]}</span>
            </div>
            {p.description && <p className="text-sm text-gray-600 mt-1">{p.description}</p>}
            <p className="text-xs text-gray-500 mt-1">{p.startDate}{p.endDate ? ` → ${p.endDate}` : ""}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
