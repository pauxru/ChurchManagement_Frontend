"use client";

// Hero strip for the Parish dashboard. Mirrors DioceseHero (dark-red
// gradient, italic AIPCA / parent-diocese label, big parish name) and
// surfaces the in-charge Pastor + quick action links. Section ordering
// matches the spec at docs/superpowers/specs/2026-05-18-groups-three-tier-design.md
// (Phase 6 — `/parish/[id]` dashboard).

import Link from "next/link";
import { rankGradient } from "@/lib/clergyDisplay";
import type { InChargePastor } from "./types";
import { initials } from "./types";

interface Props {
  parishId: number;
  parishName: string;
  dioceseId: number;
  dioceseName: string | null;
  inChargePastor: InChargePastor | null;
}

export function ParishHero({
  parishId,
  parishName,
  dioceseId,
  dioceseName,
  inChargePastor,
}: Props) {
  // Strip the trailing "Parish" / "Diocese" word so the suffix renders
  // explicitly on the next line — matches the diocese hero typography.
  const shortParishName = parishName.replace(/\s+Parish$/i, "");
  const shortDioceseName = (dioceseName ?? "")
    .replace(/\s+Diocese$/i, "")
    .trim();

  const photo = inChargePastor?.photoUrl ?? null;
  const gradient = rankGradient("Pastor");

  // The /admin/parish/{id}/settings route is a Phase 11+ placeholder per
  // the spec — wire it as a disabled-looking link for now so the slot is
  // obviously reserved. The diocese button text + style is mirrored.
  return (
    <header className="bg-gradient-to-br from-red-800 to-red-900 text-white">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Left: parish + parent diocese */}
          <div className="min-w-0">
            <p className="italic text-yellow-200 text-sm md:text-base">
              AIPCA
              {shortDioceseName && (
                <>
                  {" · "}
                  <Link
                    href={`/diocese/${dioceseId}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {shortDioceseName} Diocese
                  </Link>
                </>
              )}
            </p>
            <h1 className="mt-1 text-3xl md:text-4xl font-extrabold leading-tight">
              {shortParishName} Parish
            </h1>
            <p className="mt-1 text-sm text-red-100">Parish #{parishId}</p>
          </div>

          {/* Middle: in-charge Pastor card */}
          {inChargePastor && (
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 ring-1 ring-white/20">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  alt={inChargePastor.clergyName}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-white/80 shadow-lg"
                />
              ) : (
                <div
                  className={`w-24 h-24 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-2xl font-bold ring-4 ring-white/80 shadow-lg`}
                >
                  {initials(inChargePastor.clergyName)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-yellow-300 font-semibold">
                  In-charge Pastor
                </p>
                <p className="font-bold text-lg leading-tight">
                  {inChargePastor.clergyName}
                </p>
                <p className="text-sm text-red-100">
                  Pastor, {shortParishName} Parish
                </p>
              </div>
            </div>
          )}

          {/* Right: quick actions */}
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex gap-2">
              <Link
                href="/events"
                className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/30 text-sm px-3 py-2 rounded text-center"
              >
                Events
              </Link>
              <Link
                href="/announcements"
                className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/30 text-sm px-3 py-2 rounded text-center"
              >
                Announcements
              </Link>
            </div>
            <Link
              href={`/diocese/${dioceseId}`}
              className="bg-yellow-400 text-red-900 font-semibold text-sm px-4 py-2 rounded shadow hover:bg-yellow-300 text-center"
            >
              Diocese dashboard →
            </Link>
            {/* Parish-settings placeholder — wired to a deferred route per
                spec section "Frontend → /parish/[id] dashboard". Renders
                as a disabled tile so the slot is obviously reserved. */}
            <span
              aria-disabled="true"
              title="Parish settings — coming soon"
              className="bg-white/5 text-white/50 cursor-not-allowed border border-white/15 text-sm px-4 py-2 rounded text-center select-none"
            >
              Parish settings
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
