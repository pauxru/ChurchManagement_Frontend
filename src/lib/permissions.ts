"use client";

import { useSession } from "next-auth/react";
import { RoleTier } from "@/auth";

// Centralised permission hooks. Every "can I do X?" check in the UI should
// route through one of these so future RBAC work (per-feature flags, scoped
// admin assignments, etc.) only has to land in this file.
//
// Today each hook is a thin wrapper around the tier number on the session
// profile. As real RBAC arrives:
//   - swap the tier check for an explicit permissions list
//   - add per-resource arguments (e.g. localChurchId) and consult an
//     AdminAssignment scope map
//   - return a deny-reason alongside the boolean so the UI can hint why
//     a button is hidden
//
// Until then, callers get a stable signature they can rely on.

function useTier(): number {
  const { data: session } = useSession();
  return session?.profile?.roleLabel?.tier ?? RoleTier.Unverified;
}

// True if the caller can edit church profile, clergy, and officials.
// Editing always happens through /admin/* routes — never inline on /lc/[id].
export function useCanManageChurches(): boolean {
  return useTier() >= RoleTier.Bishop;
}

// True if the caller can manage the elected lay-board officials roster.
// Currently same gate as church management; kept separate so a future
// "Diocesan Secretary" sub-role can be admitted here without widening
// church-wide edit rights.
export function useCanManageOfficials(): boolean {
  return useTier() >= RoleTier.Bishop;
}

// True if the caller can initiate / apply clergy transfers. Today only
// Bishops (and National) — preserved as a named hook so the navbar /
// transfers page don't have to know about tier numbers.
export function useCanManageTransfers(): boolean {
  return useTier() >= RoleTier.Bishop;
}
