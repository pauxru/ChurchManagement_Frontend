"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

// How often we poll the unread-count endpoint while the user is signed in.
// 60s is a deliberate trade-off: anything faster wakes the server too often
// for a self-service feature; anything slower makes the red dot feel stale
// after a Bishop schedules a transfer.
const UNREAD_POLL_MS = 60_000;

// Mirrors backend Models/Enums.cs Position. Lay board officers only —
// clergy roles live in ClergyRanks, not here.
const POSITION_LABEL: Record<number, string> = {
  1: "Chairperson",
  2: "Vice Chairperson",
  3: "Chairlady",
  4: "Vice Chairlady",
  5: "Secretary",
  6: "Vice Secretary",
  7: "Treasurer",
  8: "Vice Treasurer",
};
const STATUS_LABEL: Record<number, string> = {
  1: "Awaiting profile", 2: "Awaiting LC selection", 3: "Awaiting OTP",
  4: "Verified", 5: "Rejected", 6: "Disabled",
};
const STATUS_COLOR: Record<number, string> = {
  4: "bg-green-100 text-green-800",
  5: "bg-red-100 text-red-800",
  6: "bg-gray-200 text-gray-700",
};

// Compute initials from a display name. "Paul Rukwaro" → "PR", "John" → "J",
// "Mary Jane Watson" → "MW" (first + last only).
function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic background colour for the initials chip so two different users
// don't get the same colour by accident. Stable across renders for one name.
function avatarColor(name: string | null | undefined): string {
  const palette = [
    "bg-red-600", "bg-orange-600", "bg-amber-600", "bg-emerald-600",
    "bg-teal-600", "bg-sky-600", "bg-indigo-600", "bg-purple-600",
    "bg-pink-600", "bg-rose-600",
  ];
  if (!name) return palette[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

interface Props {
  // Optional: tweak the avatar size on small navbars.
  size?: number;
}

export function UserMenu({ size = 36 }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const accessToken = session?.accessToken;

  // Pull the unread count when signed in. Wrapped in useCallback so the
  // polling effect can re-use the same instance and we could also call it
  // imperatively later (e.g. after the menu opens) if we wanted to refresh
  // without waiting for the next tick.
  const refreshUnread = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await apiFetch<{ count: number }>("/Notifications/unread-count", accessToken);
      setUnreadCount(data?.count ?? 0);
    } catch {
      // Swallow errors — a transient API hiccup shouldn't yell at the user
      // every minute. apiFetch already handles 401 by bouncing to sign-in.
    }
  }, [accessToken]);

  useEffect(() => {
    if (status === "loading" || !accessToken) return;
    // Fire immediately on sign-in / token change, then on a 60s interval.
    refreshUnread();
    const handle = window.setInterval(refreshUnread, UNREAD_POLL_MS);
    return () => window.clearInterval(handle);
  }, [accessToken, status, refreshUnread]);

  // Close on Escape + click-outside. Implemented inline (no extra dep) by
  // listening on the document and checking whether the click landed inside
  // our anchor container. Pointerdown rather than click so we close before
  // a Link inside also fires its own click (avoids the brief flash).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onPointer = (e: PointerEvent) => {
      const el = containerRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  if (status === "loading") {
    return <div className="w-9 h-9 rounded-full bg-white/20 animate-pulse" />;
  }

  if (!session?.user) {
    return (
      <button
        onClick={() => signIn("microsoft-entra-id")}
        className="bg-white text-red-700 font-semibold px-4 py-2 rounded hover:bg-gray-100"
      >
        Sign in
      </button>
    );
  }

  const user = session.user;
  const profile = session.profile;
  const displayName = profile?.displayName || user.name || "User";
  const email = profile?.email || user.email || "";
  const occupation = profile?.occupation ?? null;
  const officials = profile?.officials ?? [];
  // Prefer the explicit ProfilePhotoUrl the user typed in over the Entra image.
  // If we have a user-supplied URL we render with <img> (next/image's domain
  // allowlist would reject arbitrary hosts); Entra images go through next/image
  // because s.gravatar.com / cdn.auth0.com are whitelisted in next.config.ts.
  const userPhotoUrl = profile?.profilePhotoUrl || null;
  const entraPhotoUrl = !userPhotoUrl ? user.image || null : null;
  const isAdmin = (user.roles ?? []).includes("Admin");
  const isVerified = officials.some(o => o.status === 4);
  const hasUnread = unreadCount > 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 hover:opacity-90"
        aria-label={hasUnread
          ? `Open profile menu, ${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
          : "Open profile menu"}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {/* Wrap the avatar in a positioned span so the unread dot can anchor
            to its top-right without affecting the button's flex layout. */}
        <span className="relative inline-flex">
          {entraPhotoUrl ? (
            <Image
              src={entraPhotoUrl}
              alt={displayName}
              width={size}
              height={size}
              className="rounded-full object-cover"
              style={{ width: size, height: size }}
            />
          ) : userPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userPhotoUrl}
              alt={displayName}
              width={size}
              height={size}
              className="rounded-full object-cover"
              style={{ width: size, height: size }}
            />
          ) : (
            <span
              className={`inline-flex items-center justify-center rounded-full text-white font-semibold ${avatarColor(displayName)}`}
              style={{ width: size, height: size, fontSize: size * 0.4 }}
            >
              {initials(displayName)}
            </span>
          )}
          {hasUnread && (
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-red-800"
            />
          )}
        </span>
        <span className="hidden sm:inline text-sm">{displayName}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-80 bg-white text-gray-900 rounded-lg shadow-xl ring-1 ring-black/5 z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-4 border-b flex items-center gap-3">
            {entraPhotoUrl ? (
              <Image src={entraPhotoUrl} alt={displayName} width={48} height={48} className="rounded-full" />
            ) : userPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userPhotoUrl} alt={displayName} width={48} height={48} className="rounded-full object-cover" style={{ width: 48, height: 48 }} />
            ) : (
              <span
                className={`inline-flex items-center justify-center rounded-full text-white font-bold ${avatarColor(displayName)}`}
                style={{ width: 48, height: 48, fontSize: 18 }}
              >
                {initials(displayName)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{displayName}</div>
              <div className="text-xs text-gray-500 truncate">{email}</div>
              {occupation && (
                <div className="text-xs text-gray-500 truncate italic">{occupation}</div>
              )}
              {isAdmin && (
                <span className="inline-block mt-1 text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                  National admin
                </span>
              )}
            </div>
          </div>

          {/* Roles in church */}
          <div className="px-4 py-3 border-b">
            <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1.5">Your role</div>
            {officials.length === 0 && (
              <p className="text-xs text-gray-600">
                You haven&apos;t completed verification yet.
              </p>
            )}
            {officials.map(o => (
              <div key={o.localChurchOfficialId} className="flex items-start justify-between gap-2 mb-1.5 last:mb-0">
                <div className="min-w-0">
                  <div className="text-xs">
                    {o.position ? POSITION_LABEL[o.position] : "—"}
                    {o.positionDetail ? ` (${o.positionDetail})` : ""}
                    {o.localChurchName ? ` at ${o.localChurchName}` : ""}
                    {o.localChurchCode ? <span className="text-gray-500"> · {o.localChurchCode}</span> : null}
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${STATUS_COLOR[o.status] ?? "bg-yellow-100 text-yellow-800"}`}>
                  {STATUS_LABEL[o.status] ?? "Unknown"}
                </span>
              </div>
            ))}
          </div>

          {/* Links */}
          <nav className="py-1" role="none">
            {/* Notifications goes at the top — it's the most actionable
                entry and the badge mirrors the avatar dot so the menu is
                self-consistent with what attracted the user's eye. */}
            <button
              type="button"
              onClick={() => { setOpen(false); router.push("/notifications"); }}
              role="menuitem"
              className="w-full text-left flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-sm"
            >
              <span>Notifications</span>
              {hasUnread && (
                <span className="bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 min-w-[18px] text-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            {officials.length > 0 && officials[0].localChurchId && (
              <Link
                href={`/lc/${officials[0].localChurchId}`}
                onClick={() => setOpen(false)}
                role="menuitem"
                className="block px-4 py-2 hover:bg-gray-50 text-sm"
              >
                Go to my local church
              </Link>
            )}
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="block px-4 py-2 hover:bg-gray-50 text-sm"
            >
              Profile
            </Link>
            {!isVerified && (
              <Link
                href="/signup/complete"
                onClick={() => setOpen(false)}
                role="menuitem"
                className="block px-4 py-2 hover:bg-gray-50 text-sm"
              >
                Complete verification
              </Link>
            )}
            {/* Admin dashboard is reachable for any signed-in user; the
                /admin page itself shows a friendly "you don't have admin
                scope" notice for non-admins instead of 404'ing.            */}
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="block px-4 py-2 hover:bg-gray-50 text-sm"
            >
              Admin dashboard
            </Link>
            {isAdmin && (
              <Link
                href="/diocese/1"
                onClick={() => setOpen(false)}
                role="menuitem"
                className="block px-4 py-2 hover:bg-gray-50 text-sm"
              >
                Diocese overview
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin/diocese/1/settings"
                onClick={() => setOpen(false)}
                role="menuitem"
                className="block px-4 py-2 hover:bg-gray-50 text-sm"
              >
                Diocese settings
              </Link>
            )}
          </nav>

          <div className="border-t px-4 py-2">
            <button
              type="button"
              // Hit the server-side federated-signout route. It clears the
              // NextAuth cookie AND redirects through Entra's end-session
              // endpoint so the CIAM SSO cookie also dies — otherwise
              // clicking Sign in again would silently re-attach the same
              // session.
              onClick={() => { setOpen(false); window.location.href = "/api/auth/federated-signout"; }}
              className="w-full text-left text-sm text-red-700 hover:text-red-900 font-medium py-1"
              role="menuitem"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
