// Salutation prefixes mirror the AIPCA hierarchy. Same mapping the backend
// returns in ClergyPublicListItemDto.salutation, kept here so callers
// without that field (admin edit forms working from raw Clergy rows, etc.)
// stay consistent.

export const SALUTATION_BY_RANK: Record<string, string> = {
  PresidingArchbishop: "His Eminence",
  ArchBishop: "His Grace",
  Bishop: "Rt Rev",
  ArchDeacon: "Ven",
  Pastor: "Rev",
  Deacon: "Deacon",
  ChurchLeader: "CL",
  Evangelist: "Evg",
};

export function clergyDisplayName(name: string, rankLabel?: string, salutation?: string): string {
  const sal = salutation ?? (rankLabel ? SALUTATION_BY_RANK[rankLabel] : null);
  return sal ? `${sal}. ${name}` : name;
}

// Strip honorifics from a free-text name during an admin edit / bulk import.
// Mirrors the regex in AdminPeopleController.NormalizeClergyName so the
// frontend pre-flights the same rule before posting.
const HONORIFIC = /^\s*(His Eminence|His Grace|His Lordship|Most Rev\.?|Rt\.? Rev\.?|Rev\.|Ven\.|Pst\.|Pastor|Bishop|Archbishop|Presiding Archbishop|Deacon|Church Leader|CL|Evg\.?|Evangelist)\s+/i;

export function stripHonorifics(raw: string): string {
  let s = (raw ?? "").trim();
  while (HONORIFIC.test(s)) s = s.replace(HONORIFIC, "").trim();
  return s;
}
