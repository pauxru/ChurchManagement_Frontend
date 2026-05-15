"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserMenu } from "./UserMenu";
import { RolePill } from "./RolePill";

const DEFAULT_DIOCESE_ID = process.env.NEXT_PUBLIC_DEFAULT_DIOCESE_ID ?? "1";

export function Navbar() {
  const { data: session, status } = useSession();
  const signedIn = status !== "loading" && !!session?.user;
  // TEMPORARY: Transfers link is open to every signed-in user. This is
  // a deliberate operator-requested opening — restore the Bishop+ gate
  // by swapping back to `useCanManageTransfers()` from
  // @/lib/permissions once the diocesan workflow is bedded in.
  const canSeeTransfers = signedIn;

  return (
    <nav className="bg-red-800 text-white shadow sticky top-0 z-40">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0" aria-label="AIPCA home">
          <Image src="/aipca-logo.png" alt="AIPCA" width={36} height={36} className="h-9 w-auto" />
        </Link>
        <ul className="hidden md:flex items-center gap-1 text-sm">
          <li><Link href="/" className="px-3 py-2 hover:bg-white/10 rounded">Home</Link></li>
          {signedIn ? (
            <>
              <li><Link href="/churches" className="px-3 py-2 hover:bg-white/10 rounded">Churches</Link></li>
              <li><Link href="/clergy" className="px-3 py-2 hover:bg-white/10 rounded">Clergy</Link></li>
              <li><Link href="/events" className="px-3 py-2 hover:bg-white/10 rounded">Events</Link></li>
              <li><Link href="/announcements" className="px-3 py-2 hover:bg-white/10 rounded">Announcements</Link></li>
              {canSeeTransfers && (
                <li>
                  <Link
                    href={`/diocese/${DEFAULT_DIOCESE_ID}/transfers`}
                    className="px-3 py-2 hover:bg-white/10 rounded"
                  >
                    Transfers
                  </Link>
                </li>
              )}
            </>
          ) : (
            <li><Link href="/near-me" className="px-3 py-2 hover:bg-white/10 rounded">AIPCA Church Near Me</Link></li>
          )}
        </ul>

        <div className="flex items-center gap-3">
          {signedIn && <RolePill />}
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
