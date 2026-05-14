import Link from "next/link";
import { clergyDisplayName } from "@/lib/clergyDisplay";

export interface VestryMember {
  clergyId: number;
  clergyName: string;
  rankLabel: string;
  salutation: string;
  assignmentName: string | null;
  photoUrl: string | null;
}

function initials(name: string): string {
  const parts = name.replace(/\([^)]*\)/g, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const RANK_COLOR: Record<string, string> = {
  ArchDeacon:   "from-purple-700 to-purple-900",
  Pastor:       "from-red-700 to-red-900",
  Deacon:       "from-blue-700 to-blue-900",
  ChurchLeader: "from-emerald-700 to-emerald-900",
};

export function VestryCard({ member }: { member: VestryMember }) {
  const gradient = RANK_COLOR[member.rankLabel] ?? "from-gray-700 to-gray-900";
  const display = clergyDisplayName(member.clergyName, member.rankLabel, member.salutation);

  return (
    <Link
      href={`/clergy/${member.clergyId}`}
      className="block bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:border-red-300 transition"
    >
      <div className={`aspect-square bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden`}>
        {member.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.photoUrl} alt={display} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white text-5xl font-bold opacity-90">{initials(member.clergyName)}</span>
        )}
      </div>
      <div className="p-3 text-center">
        <p className="text-xs text-red-700 font-medium uppercase tracking-wide">
          {member.salutation || member.rankLabel}
        </p>
        <h4 className="mt-1 font-semibold text-sm text-gray-900">{display}</h4>
        {member.assignmentName && (
          <p className="text-xs text-gray-500 mt-1 truncate">{member.assignmentName}</p>
        )}
      </div>
    </Link>
  );
}
