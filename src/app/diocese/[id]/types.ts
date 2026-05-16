// Shared types for the Diocese overview dashboard. Kept in a sibling file so
// the page and the section components (Hero, Kpis, CessMatrix, etc.) all
// agree on the wire shapes without circular imports.

export interface CessMonth {
  periodMonth: number;
  status: string;
  amount: number | null;
  paymentReference: string | null;
}

export interface Lc {
  localChurchId: number;
  localChurchCode: string | null;
  localChurchName: string;
  parishName: string;
  officialsVerified: number;
  officialsPending: number;
  activePlans: number;
  upcomingEvents: number;
  memberCount: number;
  cessThisYear: CessMonth[];
}

export interface BishopRow {
  clergyID: number;
  clergyName: string;
  ordinationDate: string;
  isInCharge: boolean;
}

export interface Overview {
  dioceseId: number;
  dioceseName: string;
  bishops: BishopRow[];
  inChargeBishopClergyId: number | null;
  localChurches: Lc[];
}

export interface DioceseSettings {
  dioceseId: number;
  dioceseName: string;
  address: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  bishopSignatureDataUri: string | null;
  letterTemplate: string | null;
  defaultLetterCc: string | null;
}

export interface ParishRow {
  parishId: number;
  parishName: string;
  dioceseID: number;
}

// Mirrors Models/Clergy.cs as returned by /Clergy/*.
export interface ClergyApiRow {
  clergyID: number;
  clergyName: string;
  clergyRank: number;
  level: number;
  levelID: number;
  isInCharge: boolean;
  isActive: boolean;
  photoUrl: string | null;
}

// Public clergy directory entry — richer (has salutation + rankLabel +
// photo) and unauthenticated, so it's the easiest way to look up bishop
// photos for the hero.
export interface ClergyPublic {
  clergyId: number;
  clergyName: string;
  rank: number;
  rankLabel: string;
  salutation: string;
  level: number;
  assignmentName: string | null;
  ordinationYear: number | null;
  photoUrl: string | null;
  isInCharge: boolean;
}

export interface EventDto {
  eventId: number;
  eventTitle: string;
  eventCategory: string | null;
  eventStartDate: string;
  eventStartTime: string;
  eventEndDate: string;
  eventEndTime: string;
  eventLocationChurch: string;
  eventTheme: string | null;
  eventDescription: string;
}

export interface TransferDto {
  id: number;
  clergyId: number;
  clergyName: string | null;
  fromLevel: string;
  fromLevelID: number;
  fromRank: string;
  toLevel: string;
  toLevelID: number;
  toRank: string;
  effectiveDate: string;
  reason: string;
  reasonComment: string | null;
  status: string;
  initiatedAt: string;
  appliedAt: string | null;
  cancelledAt: string | null;
}

// 1-indexed ClergyRanks enum names → friendly labels. Matches
// Models/Enums.cs.
export const RANK_NAME: Record<number, string> = {
  1: "Evangelist",
  2: "ChurchLeader",
  3: "Deacon",
  4: "Pastor",
  5: "ArchDeacon",
  6: "Bishop",
  7: "ArchBishop",
  8: "PresidingArchbishop",
};

export function initials(name: string): string {
  const cleaned = (name ?? "").replace(/\([^)]*\)/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatKes(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}
