import { clergyDisplayName } from "@/lib/clergyDisplay";

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
  gradient: string;
}

function clergyInitials(name: string): string {
  const cleaned = name.replace(/\([^)]*\)/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZE_TOKENS = {
  lg: { aspect: "aspect-square", initials: "text-7xl", title: "text-xl", name: "text-2xl" },
  md: { aspect: "aspect-square", initials: "text-6xl", title: "text-base", name: "text-xl" },
  sm: { aspect: "aspect-[4/3]", initials: "text-5xl", title: "text-sm", name: "text-lg" },
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

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      <div className={`${tokens.aspect} bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={display} className="w-full h-full object-cover" />
        ) : (
          <span className={`text-white ${tokens.initials} font-bold opacity-90`}>
            {clergyInitials(rawName)}
          </span>
        )}
      </div>
      <div className="p-4 text-center">
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
