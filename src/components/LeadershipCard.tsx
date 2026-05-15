import { clergyDisplayName, rankGradient } from "@/lib/clergyDisplay";

interface ClergyDto {
  clergyId: number;
  clergyName: string;
  rankLabel?: string;
  salutation?: string;
  assignmentName: string | null;
  photoUrl?: string | null;
}

interface Props {
  clergy: ClergyDto | null;
  fallbackName?: string;
  fallbackAssignment?: string;
  titleLabel: string;
  // Extra small italic line under the name — used to surface "+ Archbishop of
  // Nairobi" when the same person holds two seats.
  secondaryTitle?: string | null;
  size: "sm" | "md" | "lg";
  // Optional override. When omitted, the gradient is picked from the clergy's
  // rank via rankGradient(). Kept for back-compat with call sites that pass a
  // hard-coded gradient string.
  gradient?: string;
}

function clergyInitials(name: string): string {
  const cleaned = name.replace(/\([^)]*\)/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// The circle sits inside the card; sizes pick a diameter that scales with the
// surrounding card density. The card itself is white with breathing room.
const SIZE_TOKENS = {
  lg: { circle: "w-40 h-40", initials: "text-5xl", title: "text-xl", name: "text-2xl" },
  md: { circle: "w-32 h-32", initials: "text-4xl", title: "text-base", name: "text-xl" },
  sm: { circle: "w-24 h-24", initials: "text-3xl", title: "text-sm", name: "text-lg" },
};

export function LeadershipCard({
  clergy,
  fallbackName,
  fallbackAssignment,
  titleLabel,
  secondaryTitle,
  size,
  gradient,
}: Props) {
  const tokens = SIZE_TOKENS[size];
  const rawName = clergy?.clergyName ?? fallbackName ?? "To be announced";
  const display = clergy
    ? clergyDisplayName(clergy.clergyName, clergy.rankLabel, clergy.salutation)
    : rawName;
  const assignment = clergy?.assignmentName ?? fallbackAssignment ?? null;
  const photo = clergy?.photoUrl ?? null;
  const grad = gradient ?? rankGradient(clergy?.rankLabel);

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 px-6 pt-8 pb-6">
      <div className="flex justify-center">
        <div
          className={`${tokens.circle} rounded-full bg-gradient-to-br ${grad} flex items-center justify-center overflow-hidden shadow-lg ring-4 ring-white`}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={display} className="w-full h-full object-cover" />
          ) : (
            <span className={`text-white ${tokens.initials} font-bold opacity-95`}>
              {clergyInitials(rawName)}
            </span>
          )}
        </div>
      </div>
      <div className="mt-5 text-center">
        <p className={`text-red-700 font-medium ${tokens.title}`}>{titleLabel}</p>
        <h3 className={`mt-1 font-bold text-gray-900 ${tokens.name}`}>{display}</h3>
        {assignment && <p className="text-sm text-gray-600 mt-1">{assignment}</p>}
        {secondaryTitle && (
          <p className="text-xs text-gray-500 italic mt-1">{secondaryTitle}</p>
        )}
      </div>
    </div>
  );
}
