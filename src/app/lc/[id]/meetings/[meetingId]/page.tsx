"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

// Single-meeting workspace. Three panels:
//   1. Header — title / chair / date / agenda + edit / cancel-meeting actions.
//   2. Notes feed — rich-text body (sanitised HTML) with author + timestamp.
//      Authored via a contentEditable mini-editor (no new npm deps).
//   3. Files — SAS-handshake upload (init -> PUT to blob -> confirm), reuses
//      the existing Minutes blob container; each row is stamped with this
//      meeting's MeetingId on the backend.

interface Meeting {
  id: number;
  title: string;
  agenda: string;
  chair: string;
  meetingDate: string;
  isCancelled: boolean;
  createdAt: string;
}
interface Note {
  id: number;
  bodyHtml: string;
  authorUserAccountId: string;
  createdAt: string;
}
interface MeetingFile {
  id: number;
  title: string;
  blobSizeBytes: number | null;
  blobContentType: string | null;
  createdAt: string;
}
interface MeetingPayload { meeting: Meeting; notes: Note[]; files: MeetingFile[]; }

// =============================================================================
// Tiny HTML sanitiser — no DOMPurify in package.json, so we ship a small one.
// Strips <script>, <style>, <iframe>, <object>, <embed>, on* event-handler
// attrs, and javascript: URLs. This is the primary client-side guard; the
// backend has its own defense-in-depth pass on save.
// =============================================================================
const DANGEROUS_TAGS = /<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi;
const DANGEROUS_SELF_TAGS = /<(script|style|iframe|object|embed)\b[^>]*\/?>/gi;
const ON_HANDLERS_DQ = /\s+on[a-z]+\s*=\s*"[^"]*"/gi;
const ON_HANDLERS_SQ = /\s+on[a-z]+\s*=\s*'[^']*'/gi;
const JS_HREF_DQ = /(href|src)\s*=\s*"\s*javascript:[^"]*"/gi;
const JS_HREF_SQ = /(href|src)\s*=\s*'\s*javascript:[^']*'/gi;

function sanitiseHtml(input: string): string {
  if (!input) return "";
  return input
    .replace(DANGEROUS_TAGS, "")
    .replace(DANGEROUS_SELF_TAGS, "")
    .replace(ON_HANDLERS_DQ, "")
    .replace(ON_HANDLERS_SQ, "")
    .replace(JS_HREF_DQ, '$1="#"')
    .replace(JS_HREF_SQ, "$1='#'");
}

// =============================================================================
// Mini rich-text editor — uses document.execCommand, deprecated but still
// works across Chrome / Edge / Safari and avoids pulling in TipTap or Lexical.
// =============================================================================
function RichTextEditor({ onSave, busy }: { onSave: (html: string) => void; busy: boolean }) {
  const editorRef = useRef<HTMLDivElement>(null);

  function exec(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  }

  function makeLink() {
    const url = window.prompt("Link URL", "https://");
    if (!url) return;
    // Refuse javascript: scheme outright at input time.
    if (/^javascript:/i.test(url.trim())) {
      alert("Links to javascript: URLs are not allowed.");
      return;
    }
    exec("createLink", url);
  }

  function save() {
    const html = editorRef.current?.innerHTML ?? "";
    const clean = sanitiseHtml(html);
    if (!clean.trim() || clean === "<br>") return;
    onSave(clean);
    if (editorRef.current) editorRef.current.innerHTML = "";
  }

  return (
    <div className="border border-gray-300 rounded-lg bg-white">
      <div className="flex flex-wrap items-center gap-1 px-2 py-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <ToolbarBtn label="B" title="Bold" bold onClick={() => exec("bold")} />
        <ToolbarBtn label="I" title="Italic" italic onClick={() => exec("italic")} />
        <ToolbarBtn label="U" title="Underline" underline onClick={() => exec("underline")} />
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <ToolbarBtn label="• List" title="Bullet list" onClick={() => exec("insertUnorderedList")} />
        <ToolbarBtn label="1. List" title="Numbered list" onClick={() => exec("insertOrderedList")} />
        <span className="mx-1 h-5 w-px bg-gray-300" />
        <ToolbarBtn label="Link" title="Insert link" onClick={makeLink} />
        <ToolbarBtn label="Clear" title="Remove formatting" onClick={() => exec("removeFormat")} />
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[140px] px-3 py-2 outline-none prose prose-sm max-w-none"
        data-placeholder="Type your meeting note here..."
      />
      <div className="flex justify-end gap-2 px-2 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <button
          onClick={save}
          disabled={busy}
          className="bg-red-700 hover:bg-red-800 text-white px-4 py-1.5 rounded text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Saving..." : "Add note"}
        </button>
      </div>
    </div>
  );
}

function ToolbarBtn({
  label, title, onClick, bold, italic, underline,
}: { label: string; title: string; onClick: () => void; bold?: boolean; italic?: boolean; underline?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`px-2 py-1 text-xs rounded hover:bg-gray-200 ${bold ? "font-bold" : ""} ${italic ? "italic" : ""} ${underline ? "underline" : ""}`}
    >
      {label}
    </button>
  );
}

// =============================================================================
// Main page
// =============================================================================
export default function MeetingDetailPage() {
  const params = useParams<{ id: string; meetingId: string }>();
  const router = useRouter();
  const lcId = Number(params?.id);
  const meetingId = Number(params?.meetingId);
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [data, setData] = useState<MeetingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Edit-meeting form state.
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editAgenda, setEditAgenda] = useState("");
  const [editChair, setEditChair] = useState("");
  const [editDate, setEditDate] = useState("");

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const payload = await apiFetch<MeetingPayload>(`/Lc/${lcId}/Meetings/${meetingId}`, token);
      setData(payload);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [lcId, meetingId, token]);
  useEffect(() => { refresh(); }, [refresh]);

  async function addNote(html: string) {
    if (!token) return;
    setSavingNote(true);
    setError(null);
    try {
      await apiFetch(`/Lc/${lcId}/Meetings/${meetingId}/notes`, token, {
        method: "POST",
        json: { bodyHtml: html },
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingNote(false);
    }
  }

  async function deleteNote(noteId: number) {
    if (!token) return;
    if (!window.confirm("Delete this note?")) return;
    try {
      await apiFetch(`/Lc/${lcId}/Meetings/${meetingId}/notes/${noteId}`, token, { method: "DELETE" });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function uploadFile(file: File) {
    if (!token) return;
    setUploading(true);
    setError(null);
    try {
      // Step 1: init -> returns SAS URL.
      const init = await apiFetch<{ minutesId: number; sasUploadUrl: string }>(
        `/Lc/${lcId}/Meetings/${meetingId}/files/init`, token,
        { method: "POST", json: { fileName: file.name, contentType: file.type, sizeBytes: file.size } }
      );
      // Step 2: PUT directly to Azure Blob via SAS.
      const putRes = await fetch(init.sasUploadUrl, {
        method: "PUT",
        headers: { "x-ms-blob-type": "BlockBlob", "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error(`Blob upload failed: ${putRes.status}`);
      // Step 3: confirm.
      await apiFetch(`/Lc/${lcId}/Meetings/${meetingId}/files/${init.minutesId}/confirm`, token, {
        method: "POST", json: { actualSizeBytes: file.size },
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function downloadFile(fileId: number) {
    if (!token) return;
    try {
      const r = await apiFetch<{ downloadUrl: string }>(
        `/Lc/${lcId}/Meetings/${meetingId}/files/${fileId}/download-url`, token
      );
      window.open(r.downloadUrl, "_blank");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function deleteFile(fileId: number) {
    if (!token) return;
    if (!window.confirm("Delete this file?")) return;
    try {
      await apiFetch(`/Lc/${lcId}/Meetings/${meetingId}/files/${fileId}`, token, { method: "DELETE" });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function startEdit() {
    if (!data) return;
    setEditTitle(data.meeting.title);
    setEditAgenda(data.meeting.agenda);
    setEditChair(data.meeting.chair);
    setEditDate(data.meeting.meetingDate);
    setEditing(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    try {
      await apiFetch(`/Lc/${lcId}/Meetings/${meetingId}`, token, {
        method: "PUT",
        json: { title: editTitle.trim(), agenda: editAgenda.trim(), chair: editChair.trim(), meetingDate: editDate },
      });
      setEditing(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function cancelMeeting() {
    if (!token) return;
    if (!window.confirm("Cancel this meeting? It will be hidden from the list (but kept for the historical record).")) return;
    try {
      await apiFetch(`/Lc/${lcId}/Meetings/${meetingId}`, token, { method: "DELETE" });
      router.push(`/lc/${lcId}/meetings`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <div className="container mx-auto px-6 py-6 text-gray-500">Loading meeting...</div>;
  if (!data) {
    return (
      <div className="container mx-auto px-6 py-6">
        <div className="text-red-700">{error ?? "Meeting not found."}</div>
        <Link href={`/lc/${lcId}/meetings`} className="text-red-700 underline text-sm">← Back to meetings</Link>
      </div>
    );
  }

  const { meeting, notes, files } = data;

  return (
    <div className="container mx-auto px-6 py-6 max-w-4xl">
      <Link href={`/lc/${lcId}/meetings`} className="text-sm text-red-700 hover:underline">← Back to meetings</Link>

      {/* Header */}
      <section className="bg-white shadow rounded-lg p-5 mt-4 border border-gray-200">
        {!editing ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900">{meeting.title}</h1>
                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                  <span><span className="font-medium text-gray-700">Chair:</span> {meeting.chair}</span>
                  <span><span className="font-medium text-gray-700">Date:</span> {meeting.meetingDate}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={startEdit} className="text-sm px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50">Edit</button>
                <button onClick={cancelMeeting} className="text-sm px-3 py-1.5 border border-red-300 text-red-700 rounded hover:bg-red-50">Cancel meeting</button>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">Main agenda</h2>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{meeting.agenda}</p>
            </div>
          </>
        ) : (
          <form onSubmit={saveEdit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-gray-700 font-medium">Title</span>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required className="mt-1 w-full border border-gray-300 px-3 py-2 rounded" />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700 font-medium">Chair</span>
                <input value={editChair} onChange={(e) => setEditChair(e.target.value)} required className="mt-1 w-full border border-gray-300 px-3 py-2 rounded" />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm text-gray-700 font-medium">Main agenda</span>
                <textarea value={editAgenda} onChange={(e) => setEditAgenda(e.target.value)} required rows={3} className="mt-1 w-full border border-gray-300 px-3 py-2 rounded" />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700 font-medium">Date</span>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} required className="mt-1 w-full border border-gray-300 px-3 py-2 rounded" />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
              <button type="submit" className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded text-sm font-medium">Save changes</button>
            </div>
          </form>
        )}
      </section>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mt-4 text-sm">{error}</div>}

      {/* Notes */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Notes</h2>
        <RichTextEditor onSave={addNote} busy={savingNote} />
        <ul className="mt-4 space-y-3">
          {notes.length === 0 && <li className="text-sm text-gray-500">No notes yet.</li>}
          {notes.map((n) => (
            <li key={n.id} className="bg-white shadow rounded-lg p-4 border border-gray-200">
              <div
                className="prose prose-sm max-w-none text-gray-800"
                dangerouslySetInnerHTML={{ __html: sanitiseHtml(n.bodyHtml) }}
              />
              <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>{new Date(n.createdAt).toLocaleString()}</span>
                <button onClick={() => deleteNote(n.id)} className="text-red-700 hover:underline">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Files */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Files</h2>
        <div className="bg-white shadow rounded-lg p-4 border border-gray-200">
          <label className="block">
            <span className="text-sm text-gray-700 font-medium">Upload an attachment</span>
            <input
              type="file"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadFile(f);
                e.target.value = ""; // allow re-selecting same file
              }}
              className="mt-2 block text-sm"
            />
          </label>
          {uploading && <p className="text-xs text-gray-500 mt-2">Uploading...</p>}
        </div>
        <ul className="mt-4 space-y-2">
          {files.length === 0 && <li className="text-sm text-gray-500">No files yet.</li>}
          {files.map((f) => (
            <li key={f.id} className="bg-white shadow rounded p-3 border border-gray-200 flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-medium text-sm text-gray-900 truncate">{f.title}</div>
                <p className="text-xs text-gray-500">
                  {new Date(f.createdAt).toLocaleString()}
                  {f.blobSizeBytes ? ` · ${(f.blobSizeBytes / 1024).toFixed(0)} KB` : ""}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <button onClick={() => downloadFile(f.id)} className="text-red-700 hover:underline">Download</button>
                <button onClick={() => deleteFile(f.id)} className="text-red-700 hover:underline">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
