"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { UserMenu } from "./UserMenu";
import { RolePill } from "./RolePill";

const DEFAULT_DIOCESE_ID = process.env.NEXT_PUBLIC_DEFAULT_DIOCESE_ID ?? "1";

interface NavItem { href: string; label: string }

export function Navbar() {
  const { data: session, status } = useSession();
  const signedIn = status !== "loading" && !!session?.user;
  // TEMPORARY: Transfers link is open to every signed-in user. Restore
  // the Bishop+ gate by swapping back to `useCanManageTransfers()` from
  // @/lib/permissions once the diocesan workflow is bedded in.
  const canSeeTransfers = signedIn;

  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Build the link list once so desktop nav + mobile drawer stay in sync.
  const items: NavItem[] = [{ href: "/", label: "Home" }];
  if (signedIn) {
    items.push(
      { href: "/churches", label: "Churches" },
      { href: "/clergy", label: "Clergy" },
      { href: "/events", label: "Events" },
      { href: "/announcements", label: "Announcements" },
      // TEMPORARY: open to every signed-in user. The diocese overview
      // page is what most operators use as their dashboard; same
      // pattern as Transfers below — restore tier gating via
      // @/lib/permissions when RBAC is bedded in.
      { href: `/diocese/${DEFAULT_DIOCESE_ID}`, label: "Diocese" },
    );
    if (canSeeTransfers) {
      items.push({ href: "/transfers", label: "Transfers" });
    }
  } else {
    items.push({ href: "/near-me", label: "AIPCA Church Near Me" });
  }

  // Close the drawer on Escape + outside tap. Same pattern as UserMenu —
  // pointerdown fires before Link's click so we don't get a stray flash.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileOpen(false); };
    const onPointer = (e: PointerEvent) => {
      const el = drawerRef.current;
      if (el && !el.contains(e.target as Node)) setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [mobileOpen]);

  return (
    <nav ref={drawerRef} className="bg-red-800 text-white shadow sticky top-0 z-40">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0" aria-label="AIPCA home">
          <Image src="/aipca-logo.png" alt="AIPCA" width={36} height={36} className="h-9 w-auto" />
        </Link>

        <ul className="hidden md:flex items-center gap-1 text-sm">
          {items.map((it) => (
            <li key={it.href}>
              <Link href={it.href} className="px-3 py-2 hover:bg-white/10 rounded">{it.label}</Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {signedIn && (
            <div className="hidden sm:block">
              <RolePill />
            </div>
          )}
          <UserMenu />
          <button
            type="button"
            onClick={() => setMobileOpen(v => !v)}
            className="md:hidden ml-1 p-2 -mr-1 rounded hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="primary-nav-mobile"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
              {mobileOpen ? (
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              ) : (
                <path fillRule="evenodd" d="M2.5 5.75A.75.75 0 013.25 5h13.5a.75.75 0 010 1.5H3.25a.75.75 0 01-.75-.75zm0 4.25A.75.75 0 013.25 9.25h13.5a.75.75 0 010 1.5H3.25a.75.75 0 01-.75-.75zm.75 3.5a.75.75 0 000 1.5h13.5a.75.75 0 000-1.5H3.25z" clipRule="evenodd" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          id="primary-nav-mobile"
          className="md:hidden border-t border-white/10 bg-red-800"
        >
          <ul className="container mx-auto px-2 py-2 flex flex-col">
            {items.map((it) => (
              <li key={it.href}>
                <Link
                  href={it.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded hover:bg-white/10 text-base"
                >
                  {it.label}
                </Link>
              </li>
            ))}
            {signedIn && (
              <li className="px-4 py-3 border-t border-white/10 mt-1">
                <RolePill />
              </li>
            )}
          </ul>
        </div>
      )}
    </nav>
  );
}
