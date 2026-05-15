// Central colour map for clergy rank → Tailwind gradient / chip classes.
// Operator-defined palette (May 2026):
//   Archbishop + PresidingArchbishop → Pink
//   Bishop                            → Red
//   Archdeacon (Ven)                  → Yellow
//   Pastor                            → Sky blue (RGB 115,194,251 = #73C2FB)
//   Deacon + ChurchLeader             → Black
//
// Used by LeadershipCard, VestryCard, ClergyView and the clergy detail hero
// so rank colouring stays consistent across the app. The sky-blue values for
// Pastor are arbitrary so Tailwind's JIT keeps them — see safelist in
// tailwind.config.ts which whitelists the from-/to- pair.

const PINK_GRAD = "from-pink-500 to-pink-700";
const RED_GRAD = "from-red-600 to-red-800";
const YELLOW_GRAD = "from-yellow-500 to-yellow-700";
const SKY_GRAD = "from-[#73c2fb] to-[#3b9fe0]";
const BLACK_GRAD = "from-gray-800 to-black";
const DEFAULT_GRAD = "from-gray-700 to-gray-900";

const PINK_CHIP = "bg-pink-100 text-pink-900";
const RED_CHIP = "bg-red-100 text-red-900";
const YELLOW_CHIP = "bg-yellow-100 text-yellow-900";
const SKY_CHIP = "bg-[#dff0fd] text-[#0b3d63]";
const BLACK_CHIP = "bg-gray-200 text-gray-900";
const DEFAULT_CHIP = "bg-gray-100 text-gray-800";

// Accepts either the enum-style rank label ("ArchBishop", "ChurchLeader") or
// the pretty form ("Archbishop", "Church Leader"). Case-insensitive on the
// pretty form. Unknown ranks fall back to a neutral grey.
function normalizeRank(label: string | null | undefined): string {
  if (!label) return "";
  return label.replace(/\s+/g, "").toLowerCase();
}

export function rankGradient(rankLabel: string | null | undefined): string {
  const n = normalizeRank(rankLabel);
  if (n === "archbishop" || n === "presidingarchbishop") return PINK_GRAD;
  if (n === "bishop") return RED_GRAD;
  if (n === "archdeacon" || n === "ven") return YELLOW_GRAD;
  if (n === "pastor" || n === "rev") return SKY_GRAD;
  if (n === "deacon" || n === "churchleader") return BLACK_GRAD;
  return DEFAULT_GRAD;
}

export function rankChip(rankLabel: string | null | undefined): string {
  const n = normalizeRank(rankLabel);
  if (n === "archbishop" || n === "presidingarchbishop") return PINK_CHIP;
  if (n === "bishop") return RED_CHIP;
  if (n === "archdeacon" || n === "ven") return YELLOW_CHIP;
  if (n === "pastor" || n === "rev") return SKY_CHIP;
  if (n === "deacon" || n === "churchleader") return BLACK_CHIP;
  return DEFAULT_CHIP;
}
