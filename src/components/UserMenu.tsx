"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

const POSITION_LABEL: Record<number, string> = {
  1: "Pastor", 2: "Treasurer", 3: "Chairperson",
  4: "Secretary", 5: "Vice Chair", 6: "Member", 7: "Other",
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
  const containerRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 hover:opacity-90"
        aria-label="Open profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
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
          </nav>

          <div className="border-t px-4 py-2">
            <button
              type="button"
              onClick={() => { setOpen(false); router.push("/"); signOut({ callbackUrl: "/" }); }}
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
