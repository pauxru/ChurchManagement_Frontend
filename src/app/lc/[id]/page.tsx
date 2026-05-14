"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { VestryCard, type VestryMember } from "@/components/VestryCard";

interface LcDetail {
  localChurchId: number;
  localChurchCode: string;
  localChurchName: string;
  description: string | null;
  parishName: string | null;
  dioceseName: string | null;
  address: string | null;
  location: string | null;
  inChargePastorName: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  serviceTimes: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  monthlyCessAmount: number | null;
}

function formatKes(amount: number | null | undefined): string {
  if (amount == null) return "Not yet set";
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(amount);
}

const MANAGE_TILES = [
  { slug: "plans",                label: "Plans",            desc: "Strategic plans, events, projects" },
  { slug: "cess",                 label: "Cess",             desc: "Monthly diocese contributions" },
  { slug: "finances",             label: "Finances",         desc: "Tithes, offerings, expenses" },
  { slug: "communication",        label: "Communication",    desc: "Posts to members + officials" },
  { slug: "groups",               label: "Groups",           desc: "Committees and ministries" },
  { slug: "fellowships",          label: "Fellowships",      desc: "Prayer cells, study groups" },
  { slug: "minutes",              label: "Meeting Minutes",  desc: "Signed minutes archive" },
  { slug: "shared-with-bishop",   label: "Bishop View",      desc: "Transparency dashboard" },
];

function placeholderInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? "").join("");
}

export default function LcOverviewPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const [lc, setLc] = useState<LcDetail | null>(null);
  const [vestry, setVestry] = useState<VestryMember[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!lcId) return;
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";
    fetch(`${base}/public/local-churches/${lcId}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.ok ? r.json() : null;
      })
      .then((d: LcDetail | null) => { if (d) setLc(d); });
    fetch(`${base}/public/local-churches/${lcId}/vestry`)
      .then(r => (r.ok ? r.json() : []))
      .then((v: VestryMember[]) => setVestry(v))
      .catch(() => setVestry([]));
  }, [lcId]);

  if (notFound) {
    return (
      <div className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold">Local Church not found</h1>
        <p className="mt-3 text-gray-600">It may have been removed. Try the <Link href="/churches" className="text-red-700 underline">churches list</Link>.</p>
      </div>
    );
  }
  if (!lc) return <div className="container mx-auto px-6 py-20 text-center text-gray-500">Loading…</div>;

  const signedIn = !!session?.user;

  return (
    <div>
      {/* Hero banner */}
      <header className="relative bg-gradient-to-br from-red-800 to-red-900 text-white">
        {lc.bannerUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lc.bannerUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        )}
        {signedIn && (
          <Link
            href={`/admin/local-churches?focus=${lc.localChurchId}`}
            className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full p-2 transition"
            aria-label="Edit this church"
            title="Edit this church"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M17.414 2.586a2 2 0 00-2.828 0L4 13.172V16h2.828L17.414 5.414a2 2 0 000-2.828z" />
            </svg>
          </Link>
        )}
        <div className="relative container mx-auto px-6 py-20 text-center">
          <div className="flex flex-col items-center gap-4">
            {lc.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lc.logoUrl}
                alt={`${lc.localChurchName} logo`}
                className="w-24 h-24 rounded-full bg-white p-2 shadow-lg object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-yellow-400 text-red-900 flex items-center justify-center font-bold text-3xl shadow-lg">
                {placeholderInitials(lc.localChurchName) || "?"}
              </div>
            )}
            {lc.localChurchCode && (
              <p className="uppercase tracking-widest text-yellow-300 text-xs font-semibold">
                {lc.localChurchCode}
              </p>
            )}
            <h1 className="text-4xl md:text-5xl font-extrabold">{lc.localChurchName}</h1>
            {(lc.parishName || lc.dioceseName) && (
              <p className="text-lg text-red-100">
                {lc.parishName && <>{lc.parishName.replace(/\s+Parish$/i, "")} Parish</>}
                {lc.parishName && lc.dioceseName && <> · </>}
                {lc.dioceseName && <>{lc.dioceseName.replace(/\s+Diocese$/i, "")} Diocese</>}
              </p>
            )}
            <p className="mt-2 text-yellow-200 italic">AIPCA · Africa Independent Pentecostal Church of Africa</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 space-y-12 max-w-5xl">
        {/* About + Service Times row */}
        <section className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-red-900 mb-3">About us</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {lc.description || (
                <span className="text-gray-400 italic">
                  This church hasn&apos;t added a description yet.
                  {signedIn && <> Admins can add one via <Link href={`/admin/local-churches`} className="underline text-red-700">/admin/local-churches</Link>.</>}
                </span>
              )}
            </p>
            {lc.inChargePastorName && (
              <p className="mt-4 text-sm">
                <span className="text-gray-500">In-charge pastor: </span>
                <span className="font-semibold">{lc.inChargePastorName}</span>
              </p>
            )}
          </div>
          <div className="space-y-4">
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
              <h2 className="text-lg font-bold text-yellow-900 mb-3">Service times</h2>
              {lc.serviceTimes ? (
                <p className="text-yellow-900 whitespace-pre-line">{lc.serviceTimes}</p>
              ) : (
                <p className="text-yellow-700/70 italic text-sm">Not yet listed.</p>
              )}
            </div>
            <div className="bg-red-50 rounded-lg border border-red-200 p-6">
              <h2 className="text-lg font-bold text-red-900 mb-2">Monthly cess</h2>
              <p className="text-2xl font-bold text-red-800">{formatKes(lc.monthlyCessAmount)}</p>
              <p className="text-xs text-red-700/70 mt-1">
                {lc.monthlyCessAmount == null
                  ? "Awaiting Bishop's allocation."
                  : "Set by the diocesan office."}
              </p>
            </div>
          </div>
        </section>

        {/* Vestry — Archdeacons, Pastors, Deacons, Church Leaders. Clicks
            into /clergy/[id]. Hidden when the LC has no clergy yet. */}
        {vestry.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-2xl font-bold text-red-900">Vestry</h2>
              <p className="text-sm text-gray-500">
                Parish clergy serving this Local Church · {vestry.length}
              </p>
            </div>
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {vestry.map((m) => (
                <li key={m.clergyId}>
                  <VestryCard member={m} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Contact + Worship cards */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-red-900 mb-3">Visit us</h2>
            <dl className="space-y-2 text-sm">
              {lc.address && (
                <div>
                  <dt className="text-gray-500">Address</dt>
                  <dd className="font-medium">{lc.address}</dd>
                </div>
              )}
              {lc.location && (
                <div>
                  <dt className="text-gray-500">Location</dt>
                  <dd className="font-medium">{lc.location}</dd>
                </div>
              )}
              {!lc.address && !lc.location && (
                <p className="text-gray-400 italic">Address not yet listed.</p>
              )}
            </dl>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-red-900 mb-3">Contact</h2>
            <dl className="space-y-2 text-sm">
              {lc.contactPhone && (
                <div>
                  <dt className="text-gray-500">Phone</dt>
                  <dd><a href={`tel:${lc.contactPhone}`} className="font-medium text-red-700 hover:underline">{lc.contactPhone}</a></dd>
                </div>
              )}
              {lc.contactEmail && (
                <div>
                  <dt className="text-gray-500">Email</dt>
                  <dd><a href={`mailto:${lc.contactEmail}`} className="font-medium text-red-700 hover:underline">{lc.contactEmail}</a></dd>
                </div>
              )}
              {lc.websiteUrl && (
                <div>
                  <dt className="text-gray-500">Website</dt>
                  <dd><a href={lc.websiteUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-red-700 hover:underline">{lc.websiteUrl}</a></dd>
                </div>
              )}
              {!lc.contactPhone && !lc.contactEmail && !lc.websiteUrl && (
                <p className="text-gray-400 italic">No contact details yet.</p>
              )}
            </dl>
          </div>
        </section>

        {/* Manage tiles — visible to anyone signed-in; backend gates the data */}
        {signedIn && (
          <section>
            <h2 className="text-2xl font-bold text-red-900 mb-4">Manage this church</h2>
            <p className="text-gray-600 mb-4">
              These workspaces are for verified officials of this church and admins above.
              Data behind each tile is fetched on demand from the backend, which still
              enforces scope.
            </p>
            <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MANAGE_TILES.map(t => (
                <li key={t.slug}>
                  <Link
                    href={`/lc/${lc.localChurchId}/${t.slug}`}
                    className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-red-300 hover:shadow-md transition"
                  >
                    <div className="font-semibold text-red-900">{t.label}</div>
                    <div className="text-xs text-gray-600 mt-1">{t.desc}</div>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={`/admin/local-churches?focus=${lc.localChurchId}`}
                  className="block bg-yellow-50 border border-yellow-200 rounded-lg p-4 hover:border-yellow-400 hover:shadow-md transition"
                >
                  <div className="font-semibold text-yellow-900">Edit page</div>
                  <div className="text-xs text-yellow-900/70 mt-1">Logo, banner, contact, service times</div>
                </Link>
              </li>
            </ul>
          </section>
        )}
      </main>

      <footer className="bg-gray-900 text-gray-300 py-8 text-center mt-12">
        <p className="text-sm">
          {lc.localChurchName} · {lc.dioceseName ? `${lc.dioceseName} Diocese · ` : ""}AIPCA
        </p>
      </footer>
    </div>
  );
}
