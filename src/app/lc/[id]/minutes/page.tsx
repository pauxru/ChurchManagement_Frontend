"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

interface Minutes { id: number; meetingDate: string; title: string; summary: string | null; blobSizeBytes: number | null; }

export default function MinutesPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [list, setList] = useState<Minutes[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try { setList(await apiFetch<Minutes[]>(`/Lc/${lcId}/Minutes`, token)); }
    catch (e) { setError((e as Error).message); }
  }, [lcId, token]);
  useEffect(() => { refresh(); }, [refresh]);

  // Three-step SAS handshake: init → PUT blob → confirm.
  async function upload() {
    if (!token || !file || !title) return;
    setBusy(true); setError(null);
    try {
      const init = await apiFetch<{ minutesId: number; sasUploadUrl: string }>(
        `/Lc/${lcId}/Minutes/init`, token,
        { method: "POST", json: { meetingDate, title, summary, fileName: file.name, contentType: file.type, sizeBytes: file.size } }
      );
      // PUT to Azure Blob directly via SAS.
      const putRes = await fetch(init.sasUploadUrl, {
        method: "PUT",
        headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error(`Blob upload failed: ${putRes.status}`);
      await apiFetch(`/Lc/${lcId}/Minutes/${init.minutesId}/confirm`, token, {
        method: "POST", json: { actualSizeBytes: file.size },
      });
      setTitle(""); setSummary(""); setFile(null); refresh();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function download(id: number) {
    if (!token) return;
    try {
      const r = await apiFetch<{ downloadUrl: string }>(`/Lc/${lcId}/Minutes/${id}/download-url`, token);
      window.open(r.downloadUrl, "_blank");
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Meeting minutes</h2>
      <div className="bg-white shadow rounded p-4 mb-4 space-y-2">
        <div className="flex gap-2">
          <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="border px-3 py-2 rounded" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Meeting title" className="border px-3 py-2 rounded flex-1" />
        </div>
        <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summary (optional)" className="w-full border px-3 py-2 rounded" />
        <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button onClick={upload} disabled={!file || !title || busy} className="bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50">
          {busy ? "Uploading..." : "Upload"}
        </button>
      </div>
      {error && <div className="text-red-700">{error}</div>}
      <ul className="space-y-2">
        {list.length === 0 && <li className="text-gray-500">No minutes yet.</li>}
        {list.map((m) => (
          <li key={m.id} className="bg-white shadow rounded p-4 flex justify-between items-center">
            <div>
              <div className="font-medium">{m.title}</div>
              <p className="text-xs text-gray-500">{m.meetingDate}{m.blobSizeBytes ? ` · ${(m.blobSizeBytes / 1024).toFixed(0)} KB` : ""}</p>
            </div>
            <button onClick={() => download(m.id)} className="text-blue-700 underline">Download</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
