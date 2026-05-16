"use client";

// Reusable clergy card for the wizard boards. Smaller than the
// /clergy + /lc VestryCard (which has a 128 px circle) so the boards can
// stack many cards in a grid, but visually consistent: same rank gradient,
// same circle, same salutation-prefixed name.
//
// Used by Page 1 (Pastors / ArchDeacons) and Page 2 (Deacons / Church Leaders)
// and the drag overlays inside both boards.

import { clergyDisplayName } from "@/lib/clergyDisplay";
import { rankGradient } from "@/lib/clergyColors";
import type { ClergyOnBoard } from "./wizard-context";

interface Props {
  clergy: ClergyOnBoard;
  isInCharge: boolean;
  onClick?: () => void;
  // Optional dim while a dnd-kit drag overlay covers the original chip.
  isDragging?: boolean;
}

function initials(name: string): string {
  const parts = name.replace(/\([^)]*\)/g, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0].slice(0, 2) || parts[0][0] || "?").toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ClergyChip({ clergy, isInCharge, onClick, isDragging }: Props) {
  const gradient = rankGradient(clergy.rankLabel);
  const display = clergyDisplayName(clergy.name, clergy.rankLabel, clergy.salutation);

  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-lg px-1.5 pt-2 pb-1.5 shadow-sm transition w-full
        ${onClick ? "cursor-pointer hover:shadow-md hover:border-red-300" : ""}
        ${isDragging ? "opacity-50" : ""}
        ${isInCharge ? "border-2 border-emerald-500" : "border border-gray-200"}`}
      title={isInCharge ? `${display} (in-charge)` : display}
    >
      {isInCharge && (
        <span
          className="absolute top-0.5 right-0.5 bg-emerald-100 text-emerald-900 text-[8px] font-semibold uppercase tracking-wide px-1 py-px rounded-full"
        >
          Lead
        </span>
      )}
      <div className="flex justify-center">
        <div
          className={`w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden shadow ring-2 ring-white`}
        >
          {clergy.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clergy.photoUrl} alt={display} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-sm font-bold opacity-95">{initials(clergy.name)}</span>
          )}
        </div>
      </div>
      <div className="mt-1 text-center">
        <p className="text-[11px] font-medium text-gray-900 leading-tight truncate">{display}</p>
        <p className="text-[9px] text-gray-500 leading-tight">{clergy.rankLabel}</p>
      </div>
    </div>
  );
}
