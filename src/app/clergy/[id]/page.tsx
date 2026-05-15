"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { clergyDisplayName } from "@/lib/clergyDisplay";
import { rankChip, rankGradient } from "@/lib/clergyColors";

// Solid background colour per rank for the hero ribbon. Keeps the name on a
// neutral white surface below — the ribbon supplies the rank colour signal
// without ever overlaying photo content under the heading.
function rankRibbonClass(rankLabel: string | null | undefined): string {
  if (!rankLabel) return "bg-gray-700";
  const n = rankLabel.replace(/\s+/g, "").toLowerCase();
  if (n === "archbishop" || n === "presidingarchbishop") return "bg-pink-600";
  if (n === "bishop") return "bg-red-700";
  if (n === "archdeacon" || n === "ven") return "bg-yellow-600";
  if (n === "pastor" || n === "rev") return "bg-blue-900";
  if (n === "deacon" || n === "churchleader") return "bg-gray-900";
  return "bg-gray-700";
}

// Coloured ring around the portrait that mirrors the ribbon shade. Tailwind's
// arbitrary-value ring colour utilities (ring-blue-900 etc.) are concrete
// classes so the JIT can pick them up at build time.
function rankRingClass(rankLabel: string | null | undefined): string {
  if (!rankLabel) return "ring-gray-300";
  const n = rankLabel.replace(/\s+/g, "").toLowerCase();
  if (n === "archbishop" || n === "presidingarchbishop") return "ring-pink-500";
  if (n === "bishop") return "ring-red-600";
  if (n === "archdeacon" || n === "ven") return "ring-yellow-500";
  if (n === "pastor" || n === "rev") return "ring-blue-900";
  if (n === "deacon" || n === "churchleader") return "ring-gray-800";
  return "ring-gray-400";
}

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

const LEVEL_LABEL: Record<number, string> = {
  1: "Local Church",
  2: "Parish",
  3: "Diocese",
  4: "Archdiocese",
  5: "National",
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

function ordinationYear(d: string | null): number | null {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt.getFullYear();
}

// Best-effort pull of an email / phone out of the free-text Description.
// Lightweight: no schema change, no false-positive recovery — if a clergy
// has neither in their bio we show a polite placeholder. Phone match handles
// the Kenyan +254 / 07xx forms most commonly entered by admins.
const EMAIL_RE = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
const PHONE_RE = /(\+?254\s?[17]\d{2}\s?\d{3}\s?\d{3}|0[17]\d{2}\s?\d{3}\s?\d{3})/;

function extractContact(desc: string | null): { email: string | null; phone: string | null } {
  if (!desc) return { email: null, phone: null };
  const em = desc.match(EMAIL_RE);
  const ph = desc.match(PHONE_RE);
  return { email: em?.[1] ?? null, phone: ph?.[1]?.replace(/\s+/g, "") ?? null };
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

  const contact = useMemo(() => extractContact(c?.description ?? null), [c?.description]);

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
  const ordYear = ordinationYear(c.ordinationDate);
  const ribbonBg = rankRibbonClass(c.rankLabel);
  const portraitRing = rankRingClass(c.rankLabel);
  const initialsGrad = rankGradient(c.rankLabel);
  const chip = rankChip(c.rankLabel);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Solid rank-coloured ribbon. Only the rank label sits on the
          coloured surface — the name + photo live below on white so
          legibility is consistent regardless of portrait content. */}
      <div className={`${ribbonBg} text-white`}>
        <div className="container mx-auto px-6 py-3 text-center">
          <p className="uppercase tracking-widest text-xs font-semibold">{rankPretty}</p>
        </div>
      </div>

      {/* Hero card — circular photo with a coloured ring matching the
          ribbon, then a large heading on a clean white surface. */}
      <header className="container mx-auto px-6 pt-8 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 px-6 py-8 flex flex-col items-center text-center">
          <div className="flex justify-center">
            {c.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.photoUrl}
                alt={display}
                className={`w-[200px] h-[200px] rounded-full object-cover shadow-lg ring-4 ${portraitRing}`}
              />
            ) : (
              <div className={`w-[200px] h-[200px] rounded-full bg-gradient-to-br ${initialsGrad} text-white flex items-center justify-center font-bold text-6xl shadow-lg ring-4 ${portraitRing}`}>
                {initials(c.clergyName)}
              </div>
            )}
          </div>
          <h1 className="mt-6 text-4xl md:text-5xl font-extrabold text-gray-900">{display}</h1>
          {c.assignmentName && (
            <p className="mt-3 text-lg text-gray-600">{c.assignmentName}</p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 space-y-6 max-w-4xl">
        {/* Quick facts */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Quick facts</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Rank</dt>
              <dd className="mt-1">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${chip}`}>
                  {rankPretty}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Level</dt>
              <dd className="mt-1 font-medium text-gray-900">{LEVEL_LABEL[c.level] ?? "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs uppercase tracking-wide text-gray-500">Assignment</dt>
              <dd className="mt-1 font-medium text-gray-900">
                {c.assignmentName ?? <span className="text-gray-400 italic">Unassigned</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Ordained</dt>
              <dd className="mt-1 font-medium text-gray-900">
                {ordYear ?? <span className="text-gray-400 italic">—</span>}
              </dd>
            </div>
          </dl>
        </section>

        {/* Biography */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Biography</h2>
          {c.description ? (
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{c.description}</p>
          ) : (
            <p className="text-gray-400 italic">Biography not yet recorded.</p>
          )}
        </section>

        {/* Ordination */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Ordination</h2>
          {ordained || c.ordainedBy || c.ordinationChurch ? (
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
            </dl>
          ) : (
            <p className="text-gray-400 italic">Ordination details not yet recorded.</p>
          )}
        </section>

        {/* Service record — placeholder anchor for the future clergy
            transfer history feature. */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Service record</h2>
          <div className="border border-dashed border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-400 italic">
              Service history will appear here once the transfer log is populated.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Contact</h2>
          {contact.email || contact.phone ? (
            <dl className="space-y-2 text-sm">
              {contact.email && (
                <div>
                  <dt className="text-gray-500">Email</dt>
                  <dd>
                    <a href={`mailto:${contact.email}`} className="font-medium text-red-700 hover:underline">
                      {contact.email}
                    </a>
                  </dd>
                </div>
              )}
              {contact.phone && (
                <div>
                  <dt className="text-gray-500">Phone</dt>
                  <dd>
                    <a href={`tel:${contact.phone}`} className="font-medium text-red-700 hover:underline">
                      {contact.phone}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-gray-400 italic">Contact details not yet recorded.</p>
          )}
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
