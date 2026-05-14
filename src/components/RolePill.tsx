"use client";

import { useSession } from "next-auth/react";
import { RoleTier } from "@/auth";

// Tier mapping is computed server-side (ProfileService.ResolveRoleLabelAsync)
// so client + server never disagree.
export function RolePill() {
  const { data: session } = useSession();
  const role = session?.profile?.roleLabel;
  if (!role) return null;
  // Don't shame unverified users with a constant "Awaiting Verification" tag.
  // The verification flow is reachable from the user menu; the pill is for
  // people who actually have a role to show off.
  if (role.tier === RoleTier.Unverified) return null;

  let className = "px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide whitespace-nowrap";
  switch (role.tier) {
    case RoleTier.National:
      className += " bg-red-100 text-red-900 border border-red-300"; break;
    case RoleTier.Archbishop:
      className += " bg-purple-100 text-purple-900 border border-purple-300"; break;
    case RoleTier.Bishop:
      className += " bg-yellow-100 text-yellow-900 border border-yellow-300"; break;
    case RoleTier.LocalChurchOfficial:
      className += " bg-blue-100 text-blue-900 border border-blue-300"; break;
    default:
      className += " bg-gray-100 text-gray-700 border border-gray-300"; break;
  }

  return (
    <span
      className={className}
      title={`Role: ${role.label}`}
      aria-label={`Role: ${role.label}`}
    >
      {role.label}
    </span>
  );
}
