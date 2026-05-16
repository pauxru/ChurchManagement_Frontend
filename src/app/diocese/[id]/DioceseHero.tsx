"use client";

// Hero strip for the Diocese overview dashboard. Mirrors the LC overview
// hero style (dark-red gradient, italic AIPCA / Archdiocese label, big
// diocese name) and adds an in-charge bishop card plus contact + quick
// actions. Contact details come from /Admin/diocese/{id}/settings which
// is auth-gated — the page swallows 403s and we silently render blanks.

import Link from "next/link";
import { clergyDisplayName, rankGradient } from "@/lib/clergyDisplay";
import type { BishopRow, ClergyPublic, DioceseSettings } from "./types";
import { initials } from "./types";

interface Props {
  dioceseId: number;
  dioceseName: string;
  archdioceseName: string;
  inChargeBishop: BishopRow | null;
  inChargeBishopPublic: ClergyPublic | null;
  settings: DioceseSettings | null;
}

export function DioceseHero({
  dioceseId,
  dioceseName,
  archdioceseName,
  inChargeBishop,
  inChargeBishopPublic,
  settings,
}: Props) {
  const displayName = inChargeBishop
    ? clergyDisplayName(
        inChargeBishop.clergyName,
        inChargeBishopPublic?.rankLabel ?? "Bishop",
        inChargeBishopPublic?.salutation ?? "Rt Rev",
      )
    : null;
  const photo = inChargeBishopPublic?.photoUrl ?? null;
  const gradient = rankGradient(inChargeBishopPublic?.rankLabel ?? "Bishop");

  const shortDioceseName = dioceseName.replace(/\s+Diocese$/i, "");

  return (
    <header className="bg-gradient-to-br from-red-800 to-red-900 text-white">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Left: name + parent line */}
          <div className="min-w-0">
            <p className="italic text-yellow-200 text-sm md:text-base">
              AIPCA · {archdioceseName} Archdiocese
            </p>
            <h1 className="mt-1 text-3xl md:text-4xl font-extrabold leading-tight">
              {shortDioceseName} Diocese
            </h1>
            {/* Contact line — degrades to nothing when settings unavailable */}
            {settings && (
              <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-red-50">
                {settings.address && (
                  <div className="flex gap-2">
                    <dt className="text-red-200 shrink-0">Address</dt>
                    <dd className="font-medium truncate">{settings.address}</dd>
                  </div>
                )}
                {settings.contactPhone && (
                  <div className="flex gap-2">
                    <dt className="text-red-200 shrink-0">Phone</dt>
                    <dd className="font-medium">
                      <a
                        href={`tel:${settings.contactPhone}`}
                        className="hover:underline"
                      >
                        {settings.contactPhone}
                      </a>
                    </dd>
                  </div>
                )}
                {settings.contactEmail && (
                  <div className="flex gap-2">
                    <dt className="text-red-200 shrink-0">Email</dt>
                    <dd className="font-medium truncate">
                      <a
                        href={`mailto:${settings.contactEmail}`}
                        className="hover:underline"
                      >
                        {settings.contactEmail}
                      </a>
                    </dd>
                  </div>
                )}
                {settings.websiteUrl && (
                  <div className="flex gap-2">
                    <dt className="text-red-200 shrink-0">Website</dt>
                    <dd className="font-medium truncate">
                      <a
                        href={settings.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {settings.websiteUrl}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          {/* Middle: bishop card */}
          {inChargeBishop && (
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 ring-1 ring-white/20">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt={inChargeBishop.clergyName}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-white/80 shadow-lg"
                />
              ) : (
                <div
                  className={`w-24 h-24 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white/80 shadow-lg`}
                >
                  {initials(inChargeBishop.clergyName)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-yellow-300 font-semibold">
                  In-charge Bishop
                </p>
                <p className="font-bold text-lg leading-tight">{displayName}</p>
                <p className="text-sm text-red-100">
                  Bishop, {shortDioceseName} Diocese
                </p>
              </div>
            </div>
          )}

          {/* Right: quick actions */}
          <div className="flex flex-col gap-2 shrink-0">
            <Link
              href={`/diocese/${dioceseId}/transfers`}
              className="bg-yellow-400 text-red-900 font-semibold text-sm px-4 py-2 rounded shadow hover:bg-yellow-300 text-center"
            >
              Schedule transfer
            </Link>
            <Link
              href={`/admin/diocese/${dioceseId}/settings`}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/30 text-sm px-4 py-2 rounded text-center"
            >
              Diocese settings
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
