"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar } from "@/components/Navbar";
import { apiFetch } from "@/lib/apiClient";

// Mirrors the controller's projection. `kindCode` is the numeric enum value
// so we can colour-map even if the string name changes server-side.
interface NotificationDto {
  id: number;
  kind: "ClergyTransfer" | "LcAnnouncement" | "SystemMessage" | string;
  kindCode: number;
  title: string;
  body: string;
  linkUrl: string | null;
  createdAt: string;
  readAt: string | null;
  isRead: boolean;
}

// Tailwind classes keyed by NotificationKind. Keeping this colocated with the
// page (rather than a shared module) means a future kind only needs editing
// here — no fan-out across components.
const KIND_STYLES: Record<number, { dot: string; chip: string; label: string }> = {
  1: { dot: "bg-amber-500",   chip: "bg-amber-100 text-amber-900",   label: "Transfer" },
  2: { dot: "bg-sky-500",     chip: "bg-sky-100 text-sky-900",       label: "Announcement" },
  3: { dot: "bg-slate-500",   chip: "bg-slate-100 text-slate-800",   label: "System" },
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  return `${Math.floor(mo / 12)} year${Math.floor(mo / 12) === 1 ? "" : "s"} ago`;
}

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const token = session?.accessToken;

  const [rows, setRows] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Treat any backend hiccup as "no notifications" rather than a scary red
  // banner. The most common cause is a freshly deployed frontend talking to
  // a backend that hasn't run the AddNotification migration yet — operators
  // shouldn't see a 404/500 stack trace because of deployment ordering.
  const reload = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch<NotificationDto[]>("/Notifications?take=100", token);
      setRows(data);
      setError(null);
    } catch {
      setRows([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (status === "loading") return;
    reload();
  }, [status, reload]);

  // Mark a single notification read. We update the row locally first so the
  // UI stays snappy (optimistic), then trust the backend's 204. If the call
  // fails the next reload() pulls the truth back.
  const markRead = async (id: number) => {
    if (!token) return;
    setBusy(true);
    setRows(prev => prev.map(r => r.id === id ? { ...r, isRead: true, readAt: new Date().toISOString() } : r));
    try {
      await apiFetch(`/Notifications/${id}/read`, token, { method: "POST" });
    } catch {
      // Silent: optimistic update stands; next reload reconciles if needed.
    } finally {
      setBusy(false);
    }
  };

  const markAll = async () => {
    if (!token) return;
    setBusy(true);
    try {
      await apiFetch("/Notifications/read-all", token, { method: "POST" });
      await reload();
    } catch {
      // Silent on failure for the same deployment-skew reason as reload().
    } finally {
      setBusy(false);
    }
  };

  // "Open" a notification: mark it read AND navigate. Bundled together so a
  // single click does the right thing and we don't leave unread breadcrumbs.
  const open = async (n: NotificationDto) => {
    if (!n.isRead) await markRead(n.id);
    if (n.linkUrl) router.push(n.linkUrl);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Navbar />
        <main className="container mx-auto px-6 py-10 max-w-3xl">
          <p className="text-gray-500">Loading...</p>
        </main>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Navbar />
        <main className="container mx-auto px-6 py-10 max-w-3xl">
          <p className="text-gray-700">Please sign in to view your notifications.</p>
        </main>
      </div>
    );
  }

  const unreadCount = rows.filter(r => !r.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      <main className="container mx-auto px-6 py-10 max-w-3xl">
        <header className="flex items-baseline justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-red-900">Notifications</h1>
            <p className="mt-1 text-sm text-gray-600">
              {loading ? "Loading..."
                : rows.length === 0 ? "Nothing yet."
                : `${rows.length} total · ${unreadCount} unread`}
            </p>
          </div>
          <button
            type="button"
            onClick={markAll}
            disabled={busy || unreadCount === 0}
            className="bg-red-700 hover:bg-red-800 text-white text-sm px-3 py-1.5 rounded disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Mark all read
          </button>
        </header>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-300 text-red-800 rounded p-3 text-sm">
            {error}
            <button className="ml-3 underline" onClick={() => setError(null)}>dismiss</button>
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-10 text-center">
            <p className="text-gray-500">You don&apos;t have any notifications yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              When the Diocese schedules a transfer or sends you a system message, it&apos;ll appear here.
            </p>
          </div>
        )}

        <ul className="space-y-3">
          {rows.map(n => {
            const style = KIND_STYLES[n.kindCode] ?? KIND_STYLES[3];
            return (
              <li
                key={n.id}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex gap-3 ${n.isRead ? "" : "border-l-4 border-red-500"}`}
              >
                {/* Icon column — coloured circle plus the kind label below. */}
                <div className="flex flex-col items-center pt-1 w-16 shrink-0">
                  <span className={`w-3 h-3 rounded-full ${style.dot}`} aria-hidden />
                  <span className={`mt-2 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded ${style.chip}`}>
                    {style.label}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => open(n)}
                      className={`text-left font-semibold truncate ${n.isRead ? "text-gray-700" : "text-gray-900"} hover:text-red-800`}
                    >
                      {n.title}
                    </button>
                    <span className="text-xs text-gray-500 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className={`mt-1 text-sm whitespace-pre-line ${n.isRead ? "text-gray-500" : "text-gray-700"}`}>
                    {n.body}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    {n.linkUrl && (
                      <button
                        type="button"
                        onClick={() => open(n)}
                        className="text-red-700 hover:underline font-medium"
                      >
                        Open
                      </button>
                    )}
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        disabled={busy}
                        className="text-gray-600 hover:text-gray-800 disabled:opacity-50"
                      >
                        Mark read
                      </button>
                    )}
                    {n.isRead && n.readAt && (
                      <span className="text-gray-400">Read {timeAgo(n.readAt)}</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
