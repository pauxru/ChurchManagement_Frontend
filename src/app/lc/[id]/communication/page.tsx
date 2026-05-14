"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

// Mirrors backend Models/Enums.cs CommunicationAudience.
const AUDIENCE = {
  1: "Members",
  2: "Pastor",
  3: "Bishop",
  4: "All",
} as const;
type AudienceId = keyof typeof AUDIENCE;

interface Msg {
  id: number;
  title: string;
  body: string;
  postedAt: string;
  expiresAt: string | null;
  audience: AudienceId;
}

export default function CommunicationPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [list, setList] = useState<Msg[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AudienceId>(4);
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
      await apiFetch(`/Lc/${lcId}/Communication`, token, {
        method: "POST",
        json: { title, body, audience },
      });
      setTitle(""); setBody(""); setAudience(4); refresh();
    } catch (e) { setError((e as Error).message); }
  }

  function audienceChipClass(a: AudienceId): string {
    switch (a) {
      case 1: return "bg-blue-100 text-blue-800";    // Members
      case 2: return "bg-amber-100 text-amber-800";  // Pastor
      case 3: return "bg-purple-100 text-purple-800"; // Bishop
      case 4: return "bg-gray-200 text-gray-700";    // All
    }
  }

  return (
    <div className="container mx-auto px-6 py-6">
      <h2 className="text-xl font-semibold mb-4">Communication</h2>
      <div className="bg-white shadow rounded p-4 mb-4 space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full border px-3 py-2 rounded"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message body"
          rows={3}
          className="w-full border px-3 py-2 rounded"
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Audience</label>
          <select
            value={audience}
            onChange={(e) => setAudience(Number(e.target.value) as AudienceId)}
            className="border px-3 py-2 rounded"
          >
            <option value={1}>Members</option>
            <option value={2}>Pastor</option>
            <option value={3}>Bishop</option>
            <option value={4}>All</option>
          </select>
          <button
            onClick={post}
            disabled={!title || !body}
            className="ml-auto bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Post
          </button>
        </div>
      </div>
      {error && <div className="text-red-700">{error}</div>}
      <ul className="space-y-3">
        {list.length === 0 && <li className="text-gray-500">No messages yet.</li>}
        {list.map((m) => (
          <li key={m.id} className="bg-white shadow rounded p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold">{m.title}</div>
              <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${audienceChipClass(m.audience ?? 4)}`}>
                {AUDIENCE[m.audience ?? 4]}
              </span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{m.body}</p>
            <p className="text-xs text-gray-500 mt-2">{new Date(m.postedAt).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
