"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { VestryCard, type VestryMember } from "@/components/VestryCard";
import { apiFetch } from "@/lib/apiClient";

const POSITION_LABEL: Record<number, string> = {
  1: "Chairperson",
  2: "Vice Chairperson",
  3: "Chairlady",
  4: "Vice Chairlady",
  5: "Secretary",
  6: "Vice Secretary",
  7: "Treasurer",
  8: "Vice Treasurer",
};

interface OfficialEntry {
  id: number;
  name: string | null;
  position: number | null;
  positionDetail: string | null;
  isActive: boolean;
  photoUrl: string | null;
}
interface LeadershipView { clergy: unknown[]; officials: OfficialEntry[] }

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
  // Expanded profile fields — each one is nullable; the overview renders
  // friendly fallback copy when they're unset so the page still looks
  // complete for a brand-new LC.
  mission: string | null;
  vision: string | null;
  themeOfYear: string | null;
  history: string | null;
  about: string | null;
  yearFounded: number | null;
  denomination: string | null;
  patronSaint: string | null;
  motto: string | null;
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
  { slug: "minutes",              label: "Meetings",         desc: "Meeting minutes and notes" },
];

function placeholderInitials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? "").join("");
}

export default function LcOverviewPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [lc, setLc] = useState<LcDetail | null>(null);
  const [vestry, setVestry] = useState<VestryMember[]>([]);
  const [officials, setOfficials] = useState<OfficialEntry[]>([]);
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

  // Leadership (elected officials) is gated server-side — only signed-in
  // users with LC scope see it. Silently swallow 403s so the section just
  // hides for everyone else.
  useEffect(() => {
    if (!lcId || !token) return;
    apiFetch<LeadershipView>(`/Lc/${lcId}/Leadership`, token)
      .then(v => setOfficials(v.officials ?? []))
      .catch(() => setOfficials([]));
  }, [lcId, token]);

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
        {vestry.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-2xl font-bold text-red-900">Vestry</h2>
              <p className="text-sm text-gray-500">
                Parish clergy serving this Local Church · {vestry.length}
              </p>
            </div>
            <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 items-center text-xs text-gray-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" /> Archdeacon
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-900" /> Pastor
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-gray-900" /> Deacon
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-gray-900" /> Church Leader
              </span>
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

        {officials.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-2xl font-bold text-red-900">Leadership</h2>
              <p className="text-sm text-gray-500">
                Elected officials · {officials.length}
              </p>
            </div>
            <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {officials.map((o) => (
                <li key={o.id} className={`bg-white border border-gray-200 rounded-xl px-4 pt-6 pb-4 text-center ${o.isActive ? "" : "opacity-60"}`}>
                  {o.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.photoUrl} alt={o.name ?? ""} className="mx-auto w-24 h-24 rounded-full object-cover ring-4 ring-white shadow" />
                  ) : (
                    <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-red-700 to-red-900 text-white flex items-center justify-center font-bold text-2xl ring-4 ring-white shadow">
                      {(o.name ?? "?").trim().slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <h4 className="mt-3 font-semibold text-sm">{o.name ?? "Unnamed official"}</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    {o.position != null ? POSITION_LABEL[o.position] ?? "Member" : "Unassigned"}
                    {o.positionDetail ? ` (${o.positionDetail})` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-red-900 mb-3">About</h2>
          {lc.about || lc.description ? (
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{lc.about || lc.description}</p>
          ) : (
            <p className="text-gray-400 italic">About this church is being added.</p>
          )}
          {lc.inChargePastorName && (
            <p className="mt-4 text-sm">
              <span className="text-gray-500">In-charge pastor: </span>
              <span className="font-semibold">{lc.inChargePastorName}</span>
            </p>
          )}
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-red-900 mb-3">Mission</h2>
            {lc.mission ? (
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{lc.mission}</p>
            ) : (
              <p className="text-gray-400 italic">Mission statement to be published.</p>
            )}
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-red-900 mb-3">Vision</h2>
            {lc.vision ? (
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{lc.vision}</p>
            ) : (
              <p className="text-gray-400 italic">Vision statement to be published.</p>
            )}
          </div>
        </section>

        <section className="bg-yellow-100 border-l-4 border-yellow-400 rounded-r-lg px-6 py-4">
          <p className="text-xs uppercase tracking-widest text-yellow-800 font-semibold mb-1">
            Theme of the year
          </p>
          {lc.themeOfYear ? (
            <p className="text-yellow-900 text-lg font-medium italic">&ldquo;{lc.themeOfYear}&rdquo;</p>
          ) : (
            <p className="text-yellow-800/70 italic">No theme set for this year.</p>
          )}
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-red-900 mb-3">Our history</h2>
          {lc.history ? (
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{lc.history}</p>
          ) : (
            <p className="text-gray-400 italic">Our story will be added here soon.</p>
          )}
        </section>

        <section className="grid md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-red-900 mb-3">At a glance</h2>
            {(() => {
              const facts: Array<{ label: string; value: string }> = [];
              if (lc.yearFounded != null) facts.push({ label: "Founded", value: String(lc.yearFounded) });
              if (lc.denomination) facts.push({ label: "Denomination", value: lc.denomination });
              if (lc.patronSaint) facts.push({ label: "Patron saint", value: lc.patronSaint });
              if (lc.motto) facts.push({ label: "Motto", value: lc.motto });
              if (facts.length === 0) {
                return (
                  <p className="text-gray-400 italic text-sm">
                    Quick facts (year founded, denomination, patron saint, motto) will appear here.
                  </p>
                );
              }
              return (
                <dl className="space-y-2 text-sm">
                  {facts.map(f => (
                    <div key={f.label} className="flex justify-between gap-4 border-b border-gray-200 last:border-0 pb-2 last:pb-0">
                      <dt className="text-gray-500">{f.label}</dt>
                      <dd className="font-medium text-right">{f.value}</dd>
                    </div>
                  ))}
                </dl>
              );
            })()}
          </div>
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
        </section>

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
