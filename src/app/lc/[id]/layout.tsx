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
// "Minutes" is now "Meetings" — the new workspace lives at /meetings and is
// built around Meetings (title + agenda + chair + date) with attached
// rich-text notes and file uploads. The legacy /minutes route is left in
// place but is no longer linked from the tab strip.
// Tabs after the May-2026 consolidation:
//   - Cess folded into Finances (button in Finances opens /cess)
//   - Fellowships + Groups merged into Ministries
//   - Communication + Meetings merged into Secretariate
//   - Leadership is now part of the Overview (Church Office section);
//     the /leadership route still exists for direct nav + admin reach.
const TABS = [
  { slug: "", label: "Overview" },
  { slug: "members", label: "Members" },
  { slug: "plans", label: "Projects" },
  { slug: "finances", label: "Finances" },
  { slug: "ministries", label: "Ministries" },
  { slug: "secretariate", label: "Secretariate" },
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {hasAccess && info && (
        <header className="bg-white border-b sticky top-[60px] z-30">
          {/* On phones the tab strip overflows horizontally; force the
              first tab against the left edge so the active "Overview"
              indicator stays in view instead of being centred and
              scrolled off-screen. Desktop keeps the centred container. */}
          <nav className="md:container md:mx-auto px-3 md:px-6 overflow-x-auto">
            <ul className="flex gap-1 text-sm justify-start md:justify-start whitespace-nowrap">
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
