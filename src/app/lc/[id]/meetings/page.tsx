"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

// Meetings workspace — list view. Each row is one Meeting. The secretary
// creates a meeting here first (Title / Agenda / Chair / Date) and then drills
// into it to add rich-text notes and file uploads.
interface Meeting {
  id: number;
  title: string;
  agenda: string;
  chair: string;
  meetingDate: string;
  isCancelled: boolean;
  createdAt: string;
}

export default function MeetingsPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [list, setList] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [chair, setChair] = useState("");
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch<Meeting[]>(`/Lc/${lcId}/Meetings`, token);
      setList(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [lcId, token]);

  useEffect(() => { refresh(); }, [refresh]);

  async function createMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!title.trim() || !agenda.trim() || !chair.trim() || !meetingDate) {
      setError("Title, agenda, chair, and date are all required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/Lc/${lcId}/Meetings`, token, {
        method: "POST",
        json: { title: title.trim(), agenda: agenda.trim(), chair: chair.trim(), meetingDate },
      });
      setTitle(""); setAgenda(""); setChair("");
      setMeetingDate(new Date().toISOString().slice(0, 10));
      setShowForm(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
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
          <h2 className="text-lg font-semibold mb-4 text-gray-900">New meeting</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-700 font-medium">Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="text-gray-500 text-sm">Loading meetings...</div>
      ) : list.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center border border-gray-200">
          <p className="text-gray-600">No meetings yet.</p>
          <p className="text-sm text-gray-500 mt-1">Click <span className="font-medium">New meeting</span> to create your first one.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((m) => (
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
    </div>
  );
}
