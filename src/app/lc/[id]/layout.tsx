"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { Navbar } from "@/components/Navbar";

interface AccessCheck { lcId: number; name: string; code: string | null; }

// "Shared with Bishop" is replaced by "Members" + "Leadership" (operator
// feedback May 2026 — bishops already see this LC via the dedicated /bishop
// view, no need to duplicate it inside the LC workspace).
// "Minutes" is re-labelled "Meetings"; the route stays at /minutes for now
// since the existing SAS upload flow is unchanged this batch.
const TABS = [
  { slug: "", label: "Overview" },
  { slug: "members", label: "Members" },
  { slug: "leadership", label: "Leadership" },
  { slug: "plans", label: "Projects" },
  { slug: "cess", label: "Cess" },
  { slug: "finances", label: "Finances" },
  { slug: "communication", label: "Communication" },
  { slug: "groups", label: "Groups" },
  { slug: "fellowships", label: "Fellowships" },
  { slug: "minutes", label: "Meetings" },
];

export default function LcLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const { data: session } = useSession();
  const token = session?.accessToken;
  const lcId = Number(params?.id);
  const [info, setInfo] = useState<AccessCheck | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  // Try the access-check, but it's only required for the management tabs.
  // The Overview page (lc/[id]/page.tsx) reads /public/local-churches/{id}
  // which is anonymous, so it works whether or not access-check succeeds.
  useEffect(() => {
    if (!token || !lcId) return;
    apiFetch<AccessCheck>(`/Lc/${lcId}/access-check`, token)
      .then((r) => { setInfo(r); setHasAccess(true); })
      .catch(() => { setHasAccess(false); });
  }, [lcId, token]);

  const base = `/lc/${lcId}`;
  const onOverview = pathname === base;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {hasAccess && info && !onOverview && (
        <header className="bg-white border-b sticky top-[60px] z-30">
          <div className="container mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div>
              <Link href={base} className="text-sm text-red-700 hover:underline">← {info.name}</Link>
              {info.code && <span className="ml-2 text-xs font-mono text-gray-500">{info.code}</span>}
            </div>
          </div>
          <nav className="container mx-auto px-6 overflow-x-auto">
            <ul className="flex gap-1 text-sm">
              {TABS.map((t) => {
                const href = t.slug ? `${base}/${t.slug}` : base;
                const active = pathname === href || (t.slug && pathname?.startsWith(href + "/"));
                return (
                  <li key={t.slug}>
                    <Link
                      href={href}
                      className={`block px-4 py-2 border-b-2 ${active ? "border-red-700 font-semibold text-red-700" : "border-transparent text-gray-700 hover:text-red-700"}`}
                    >
                      {t.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </header>
      )}
      <main>{children}</main>
    </div>
  );
}
