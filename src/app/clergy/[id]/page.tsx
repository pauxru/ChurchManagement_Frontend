"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { clergyDisplayName } from "@/lib/clergyDisplay";

interface ClergyDetail {
  clergyId: number;
  clergyName: string;
  rank: number;
  rankLabel: string;
  salutation: string;
  level: number;
  assignmentName: string | null;
  ordinationDate: string | null;
  ordainedBy: string | null;
  ordinationChurch: string | null;
  description: string | null;
  photoUrl: string | null;
}

const RANK_PRETTY: Record<string, string> = {
  PresidingArchbishop: "Presiding Archbishop",
  ArchBishop: "Archbishop",
  Bishop: "Bishop",
  ArchDeacon: "Archdeacon",
  Pastor: "Pastor",
  Deacon: "Deacon",
  ChurchLeader: "Church Leader",
  Evangelist: "Evangelist",
};

function initials(name: string): string {
  const parts = name.replace(/\([^)]*\)/g, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatYearOrDate(d: string | null): string | null {
  if (!d) return null;
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return null;
    return dt.toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" });
  } catch { return null; }
}

export default function ClergyDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [c, setC] = useState<ClergyDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";
    fetch(`${base}/public/clergy/${id}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then((d: ClergyDetail | null) => { if (d) setC(d); });
  }, [id]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="container mx-auto px-6 py-20 text-center">
          <h1 className="text-2xl font-bold">Clergy not found</h1>
          <p className="mt-3 text-gray-600">
            <Link href="/clergy" className="text-red-700 underline">Browse all clergy →</Link>
          </p>
        </div>
      </div>
    );
  }
  if (!c) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="container mx-auto px-6 py-20 text-center text-gray-500">Loading…</div>
      </div>
    );
  }

  const display = clergyDisplayName(c.clergyName, c.rankLabel, c.salutation);
  const rankPretty = RANK_PRETTY[c.rankLabel] ?? c.rankLabel;
  const ordained = formatYearOrDate(c.ordinationDate);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <header className="relative bg-gradient-to-br from-red-800 to-red-900 text-white">
        <div className="container mx-auto px-6 py-16">
          <div className="grid md:grid-cols-3 gap-8 items-center max-w-4xl mx-auto">
            <div className="flex justify-center">
              {c.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.photoUrl}
                  alt={display}
                  className="w-44 h-44 rounded-full object-cover shadow-lg ring-4 ring-white/30"
                />
              ) : (
                <div className="w-44 h-44 rounded-full bg-yellow-400 text-red-900 flex items-center justify-center font-bold text-5xl shadow-lg ring-4 ring-white/30">
                  {initials(c.clergyName)}
                </div>
              )}
            </div>
            <div className="md:col-span-2 text-center md:text-left">
              <p className="uppercase tracking-widest text-yellow-300 text-xs font-semibold">
                {rankPretty}
              </p>
              <h1 className="mt-2 text-4xl md:text-5xl font-extrabold">{display}</h1>
              {c.assignmentName && (
                <p className="mt-3 text-lg text-red-100">{c.assignmentName}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 space-y-8 max-w-3xl">
        {c.description && (
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-red-900 mb-3">Biography</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{c.description}</p>
          </section>
        )}

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-red-900 mb-4">Ordination</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {ordained && (
              <div>
                <dt className="text-gray-500">Date</dt>
                <dd className="font-medium">{ordained}</dd>
              </div>
            )}
            {c.ordainedBy && (
              <div>
                <dt className="text-gray-500">Ordained by</dt>
                <dd className="font-medium">{c.ordainedBy}</dd>
              </div>
            )}
            {c.ordinationChurch && (
              <div>
                <dt className="text-gray-500">Ordination church</dt>
                <dd className="font-medium">{c.ordinationChurch}</dd>
              </div>
            )}
            {!ordained && !c.ordainedBy && !c.ordinationChurch && (
              <p className="text-gray-400 italic col-span-2">Ordination details not yet recorded.</p>
            )}
          </dl>
        </section>

        <div className="flex justify-center pt-2">
          <Link href="/clergy" className="text-sm text-red-700 hover:underline">
            ← All clergy
          </Link>
        </div>
      </main>
    </div>
  );
}
