"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

interface Msg { id: number; title: string; body: string; postedAt: string; expiresAt: string | null; }

export default function CommunicationPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [list, setList] = useState<Msg[]>([]);
  const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try { setList(await apiFetch<Msg[]>(`/Lc/${lcId}/Communication`, token)); }
    catch (e) { setError((e as Error).message); }
  }, [lcId, token]);
  useEffect(() => { refresh(); }, [refresh]);

  async function post() {
    if (!token || !title || !body) return;
    try {
      await apiFetch(`/Lc/${lcId}/Communication`, token, { method: "POST", json: { title, body } });
      setTitle(""); setBody(""); refresh();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Communication</h2>
      <div className="bg-white shadow rounded p-4 mb-4 space-y-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full border px-3 py-2 rounded" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message body" rows={3} className="w-full border px-3 py-2 rounded" />
        <button onClick={post} disabled={!title || !body} className="bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50">Post</button>
      </div>
      {error && <div className="text-red-700">{error}</div>}
      <ul className="space-y-3">
        {list.length === 0 && <li className="text-gray-500">No messages yet.</li>}
        {list.map((m) => (
          <li key={m.id} className="bg-white shadow rounded p-4">
            <div className="font-semibold">{m.title}</div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{m.body}</p>
            <p className="text-xs text-gray-500 mt-2">{new Date(m.postedAt).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
