"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

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

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
  const officials = profile?.officials ?? [];
  const hasPhoto = !!user.image;
  const isAdmin = (user.roles ?? []).includes("Admin");
  const isVerified = officials.some(o => o.status === 4);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 hover:opacity-90"
        aria-label="Open profile menu"
      >
        {hasPhoto ? (
          <Image
            src={user.image!}
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
          className="fixed inset-0 z-50 bg-black/40 flex items-start sm:items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-md mt-12 sm:mt-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b flex items-center gap-4">
              {hasPhoto ? (
                <Image src={user.image!} alt={displayName} width={56} height={56} className="rounded-full" />
              ) : (
                <span
                  className={`inline-flex items-center justify-center rounded-full text-white font-bold ${avatarColor(displayName)}`}
                  style={{ width: 56, height: 56, fontSize: 22 }}
                >
                  {initials(displayName)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{displayName}</div>
                <div className="text-sm text-gray-500 truncate">{email}</div>
                {isAdmin && (
                  <span className="inline-block mt-1 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                    National admin
                  </span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Roles in church */}
            <div className="px-6 py-4 border-b">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Your role</div>
              {officials.length === 0 && (
                <p className="text-sm text-gray-600">
                  You haven&apos;t completed verification yet.
                </p>
              )}
              {officials.map(o => (
                <div key={o.localChurchOfficialId} className="flex items-start justify-between gap-3 mb-2 last:mb-0">
                  <div>
                    <div className="text-sm">
                      {o.position ? POSITION_LABEL[o.position] : "—"}
                      {o.positionDetail ? ` (${o.positionDetail})` : ""}
                      {o.localChurchName ? ` at ${o.localChurchName}` : ""}
                      {o.localChurchCode ? <span className="text-gray-500"> · {o.localChurchCode}</span> : null}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLOR[o.status] ?? "bg-yellow-100 text-yellow-800"}`}>
                    {STATUS_LABEL[o.status] ?? "Unknown"}
                  </span>
                </div>
              ))}
            </div>

            {/* Links */}
            <nav className="py-2">
              {officials.length > 0 && officials[0].localChurchId && (
                <Link
                  href={`/lc/${officials[0].localChurchId}`}
                  onClick={() => setOpen(false)}
                  className="block px-6 py-2.5 hover:bg-gray-50 text-sm"
                >
                  Go to my local church
                </Link>
              )}
              <Link
                href="/profile"
                onClick={() => setOpen(false)}
                className="block px-6 py-2.5 hover:bg-gray-50 text-sm"
              >
                Profile
              </Link>
              {!isVerified && (
                <Link
                  href="/signup/complete"
                  onClick={() => setOpen(false)}
                  className="block px-6 py-2.5 hover:bg-gray-50 text-sm"
                >
                  Complete verification
                </Link>
              )}
              {isAdmin && (
                <>
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="block px-6 py-2.5 hover:bg-gray-50 text-sm"
                  >
                    Admin dashboard
                  </Link>
                  <Link
                    href="/diocese/1"
                    onClick={() => setOpen(false)}
                    className="block px-6 py-2.5 hover:bg-gray-50 text-sm"
                  >
                    Diocese overview
                  </Link>
                </>
              )}
            </nav>

            <div className="border-t px-6 py-3">
              <button
                onClick={() => { setOpen(false); router.push("/"); signOut({ callbackUrl: "/" }); }}
                className="w-full text-left text-sm text-red-700 hover:text-red-900 font-medium py-1"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
