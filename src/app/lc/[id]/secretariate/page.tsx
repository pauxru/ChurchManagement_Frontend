"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

// Combined Secretariate view: Communication on top, Meetings below.
// Each section keeps its own local state — no shared store, no extracted
// helpers — so the merged page mirrors the standalone pages 1:1.

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

interface Meeting {
  id: number;
  title: string;
  agenda: string;
  chair: string;
  meetingDate: string;
  isCancelled: boolean;
  createdAt: string;
}

export default function SecretariatePage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;

  // ---- Communication state ----
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [audience, setAudience] = useState<AudienceId>(4);
  const [msgError, setMsgError] = useState<string | null>(null);

  const refreshMsgs = useCallback(async () => {
    if (!token) return;
    try {
      setMsgs(await apiFetch<Msg[]>(`/Lc/${lcId}/Communication`, token));
    } catch (e) {
      setMsgError((e as Error).message);
    }
  }, [lcId, token]);
  useEffect(() => { refreshMsgs(); }, [refreshMsgs]);

  async function postMsg() {
    if (!token || !msgTitle || !msgBody) return;
    try {
      await apiFetch(`/Lc/${lcId}/Communication`, token, {
        method: "POST",
        json: { title: msgTitle, body: msgBody, audience },
      });
      setMsgTitle(""); setMsgBody(""); setAudience(4);
      refreshMsgs();
    } catch (e) {
      setMsgError((e as Error).message);
    }
  }

  function audienceChipClass(a: AudienceId): string {
    switch (a) {
      case 1: return "bg-blue-100 text-blue-800";    // Members
      case 2: return "bg-amber-100 text-amber-800";  // Pastor
      case 3: return "bg-purple-100 text-purple-800"; // Bishop
      case 4: return "bg-gray-200 text-gray-700";    // All
    }
  }

  // ---- Meetings state ----
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);
  const [meetingsError, setMeetingsError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [chair, setChair] = useState("");
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const refreshMeetings = useCallback(async () => {
    if (!token) return;
    setMeetingsLoading(true);
    try {
      const data = await apiFetch<Meeting[]>(`/Lc/${lcId}/Meetings`, token);
      setMeetings(data);
      setMeetingsError(null);
    } catch (e) {
      setMeetingsError((e as Error).message);
    } finally {
      setMeetingsLoading(false);
    }
  }, [lcId, token]);
  useEffect(() => { refreshMeetings(); }, [refreshMeetings]);

  async function createMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!meetingTitle.trim() || !agenda.trim() || !chair.trim() || !meetingDate) {
      setMeetingsError("Title, agenda, chair, and date are all required.");
      return;
    }
    setSaving(true);
    setMeetingsError(null);
    try {
      await apiFetch(`/Lc/${lcId}/Meetings`, token, {
        method: "POST",
        json: { title: meetingTitle.trim(), agenda: agenda.trim(), chair: chair.trim(), meetingDate },
      });
      setMeetingTitle(""); setAgenda(""); setChair("");
      setMeetingDate(new Date().toISOString().slice(0, 10));
      setShowForm(false);
      await refreshMeetings();
    } catch (e) {
      setMeetingsError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto px-6 py-6 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Secretariate</h1>
        <p className="text-sm text-gray-600 mt-1">
          Meetings and church-wide communication.
        </p>
      </div>

      <section>
        <h2 className="text-xl font-semibold mb-1">Communication</h2>
        <p className="text-sm text-gray-500 mb-4">
          Posts the LC office sends to members and admins.
        </p>
        <div className="bg-white shadow rounded p-4 mb-4 space-y-2">
          <input
            value={msgTitle}
            onChange={(e) => setMsgTitle(e.target.value)}
            placeholder="Title"
            className="w-full border px-3 py-2 rounded"
          />
          <textarea
            value={msgBody}
            onChange={(e) => setMsgBody(e.target.value)}
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
              onClick={postMsg}
              disabled={!msgTitle || !msgBody}
              className="ml-auto bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </div>
        {msgError && <div className="text-red-700">{msgError}</div>}
        <ul className="space-y-3">
          {msgs.length === 0 && <li className="text-gray-500">No messages yet.</li>}
          {msgs.map((m) => (
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
      </section>

      <div className="my-10 border-t border-gray-200" />

      <section>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-semibold mb-1">Meetings</h2>
            <p className="text-sm text-gray-500">
              Scheduled meetings with agenda, chair, and notes.
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Create a meeting first, then add notes and upload files inside it.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded shadow-sm text-sm font-medium"
          >
            {showForm ? "Cancel" : "+ New meeting"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={createMeeting} className="bg-white shadow rounded-lg p-5 mb-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">New meeting</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-gray-700 font-medium">Title</span>
                <input
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  required
                  placeholder="e.g. October Vestry Meeting"
                  className="mt-1 w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700 font-medium">Chair</span>
                <input
                  value={chair}
                  onChange={(e) => setChair(e.target.value)}
                  required
                  placeholder="e.g. Pastor John Doe"
                  className="mt-1 w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm text-gray-700 font-medium">Main agenda</span>
                <textarea
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  required
                  rows={3}
                  placeholder="Brief summary of what the meeting will cover"
                  className="mt-1 w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700 font-medium">Date</span>
                <input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  required
                  className="mt-1 w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create meeting"}
              </button>
            </div>
          </form>
        )}

        {meetingsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4 text-sm">{meetingsError}</div>
        )}

        {meetingsLoading ? (
          <div className="text-gray-500 text-sm">Loading meetings...</div>
        ) : meetings.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center border border-gray-200">
            <p className="text-gray-600">No meetings yet.</p>
            <p className="text-sm text-gray-500 mt-1">Click <span className="font-medium">New meeting</span> to create your first one.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {meetings.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/lc/${lcId}/meetings/${m.id}`}
                  className="block bg-white shadow rounded-lg p-4 hover:shadow-md transition border border-gray-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{m.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{m.agenda}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span><span className="font-medium">Chair:</span> {m.chair}</span>
                        <span><span className="font-medium">Date:</span> {m.meetingDate}</span>
                      </div>
                    </div>
                    <div className="text-red-700 text-sm font-medium whitespace-nowrap">Open →</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
