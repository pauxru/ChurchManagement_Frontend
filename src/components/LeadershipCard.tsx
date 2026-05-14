interface ClergyDto {
  clergyId: number;
  clergyName: string;
  assignmentName: string | null;
  ordinationYear?: number | null;
}

interface Props {
  clergy: ClergyDto | null;
  fallbackName?: string;
  fallbackAssignment?: string;
  titleLabel: string;
  size: "sm" | "md" | "lg";
  gradient: string;
}

function clergyInitials(name: string): string {
  const cleaned = name
    .replace(/^(Bishop|Archbishop|Presiding Archbishop)\s+/i, "")
    .replace(/\([^)]*\)/g, "")
    .trim();
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
  size,
  gradient,
}: Props) {
  const tokens = SIZE_TOKENS[size];
  const name = clergy?.clergyName ?? fallbackName ?? "To be announced";
  const assignment = clergy?.assignmentName ?? fallbackAssignment ?? null;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      <div className={`${tokens.aspect} bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <span className={`text-white ${tokens.initials} font-bold opacity-90`}>
          {clergyInitials(name)}
        </span>
      </div>
      <div className="p-4 text-center">
        <p className={`text-red-700 font-medium ${tokens.title}`}>{titleLabel}</p>
        <h3 className={`mt-1 font-bold text-gray-900 ${tokens.name}`}>{name}</h3>
        {assignment && <p className="text-sm text-gray-600 mt-1">{assignment}</p>}
        {clergy?.ordinationYear && (
          <p className="text-xs text-gray-500 mt-2">Ordained {clergy.ordinationYear}</p>
        )}
      </div>
    </div>
  );
}
