// Shared types for the Parish dashboard. Mirrors the wire shape returned
// by GET /Parish/{id}/overview (Phase 6 of the groups + five-tier RBAC
// design — docs/superpowers/specs/2026-05-18-groups-three-tier-design.md).
//
// The LC summary shape intentionally matches `Lc` over in the diocese
// dashboard so we can pass parish LCs straight into the existing
// CessMatrix component without a translation layer.

import type { Lc as DioceseLc } from "@/app/diocese/[id]/types";

export interface CessMonth {
  periodMonth: number;
  status: string;
  amount: number | null;
  paymentReference: string | null;
}

// Parish-scoped LC summary. Compatible with the diocese dashboard's `Lc`
// shape — we pass these straight into CessMatrix. The matrix's parish
// grouping collapses to a single group when every row shares one parish.
export interface ParishLc {
  localChurchId: number;
  localChurchCode: string | null;
  localChurchName: string;
  officialsVerified: number;
  officialsPending: number;
  activePlans: number;
  upcomingEvents: number;
  memberCount: number;
  cessThisYear: CessMonth[];
}

export interface InChargePastor {
  clergyId: number;
  clergyName: string;
  photoUrl: string | null;
}

export interface ParishGroup {
  groupId: number;
  name: string;
  memberCount: number;
  leaderName: string | null;
}

export interface ParishOverview {
  parishId: number;
  parishName: string;
  dioceseId: number;
  dioceseName: string | null;
  inChargePastor: InChargePastor | null;
  localChurches: ParishLc[];
  groups: ParishGroup[];
}

// Map a ParishLc into the diocese dashboard's `Lc` shape so the CessMatrix
// + KpiCards components can be reused as-is. The matrix groups rows by
// parishName, which we stamp onto every row here with the single parish
// name — every row sharing a parish causes the grouping to collapse to a
// single sub-section, exactly the visual we want at the parish tier.
export function toDioceseLc(lc: ParishLc, parishName: string): DioceseLc {
  return {
    localChurchId: lc.localChurchId,
    localChurchCode: lc.localChurchCode,
    localChurchName: lc.localChurchName,
    parishName,
    officialsVerified: lc.officialsVerified,
    officialsPending: lc.officialsPending,
    activePlans: lc.activePlans,
    upcomingEvents: lc.upcomingEvents,
    memberCount: lc.memberCount,
    cessThisYear: lc.cessThisYear,
  };
}

export function initials(name: string): string {
  const cleaned = (name ?? "").replace(/\([^)]*\)/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
