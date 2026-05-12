"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

interface AccessCheck { lcId: number; name: string; code: string | null; }

const TABS = [
  { slug: "", label: "Overview" },
  { slug: "plans", label: "Plans" },
  { slug: "cess", label: "Cess" },
  { slug: "finances", label: "Finances" },
  { slug: "communication", label: "Communication" },
  { slug: "groups", label: "Groups" },
  { slug: "fellowships", label: "Fellowships" },
  { slug: "minutes", label: "Minutes" },
  { slug: "shared-with-bishop", label: "Shared with Bishop" },
];

export default function LcLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const { data: session } = useSession();
  const token = session?.accessToken;
  const lcId = Number(params?.id);
  const [info, setInfo] = useState<AccessCheck | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!token || !lcId) return;
    apiFetch<AccessCheck>(`/Lc/${lcId}/access-check`, token)
      .then(setInfo)
      .catch(() => setDenied(true));
  }, [lcId, token]);

  if (denied) {
    return (
      <div className="container mx-auto px-6 py-10 max-w-2xl">
        <h1 className="text-2xl font-bold mb-2">Access denied</h1>
        <p className="text-gray-600">You don&apos;t have permission to view this local church.</p>
        <Link href="/" className="text-blue-700 underline">Back home</Link>
      </div>
    );
  }
  if (!info) return <div className="p-6">Loading...</div>;

  const base = `/lc/${lcId}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-xl font-bold">{info.name}{info.code ? ` (${info.code})` : ""}</h1>
        </div>
        <nav className="container mx-auto px-6 overflow-x-auto">
          <ul className="flex gap-1 text-sm">
            {TABS.map((t) => {
              const href = t.slug ? `${base}/${t.slug}` : base;
              const active = pathname === href || (t.slug && pathname?.startsWith(href + "/")) || (t.slug === "" && pathname === base);
              return (
                <li key={t.slug}>
                  <Link
                    href={href}
                    className={`block px-4 py-2 border-b-2 ${active ? "border-blue-700 font-semibold text-blue-700" : "border-transparent text-gray-700 hover:text-blue-700"}`}
                  >
                    {t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <main className="container mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
