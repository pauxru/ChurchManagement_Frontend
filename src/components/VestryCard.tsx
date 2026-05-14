import Link from "next/link";
import { clergyDisplayName, rankGradient } from "@/lib/clergyDisplay";

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

export function VestryCard({ member }: { member: VestryMember }) {
  const gradient = rankGradient(member.rankLabel);
  // clergyDisplayName already prefixes the salutation ("Rev. John Mwangi");
  // surfacing the same salutation in a separate uppercase chip above the
  // name caused the duplicate "REV" rendering reported by ops, so we drop it.
  const display = clergyDisplayName(member.clergyName, member.rankLabel, member.salutation);

  return (
    <Link
      href={`/clergy/${member.clergyId}`}
      className="block bg-white border border-gray-200 rounded-lg px-3 pt-5 pb-3 hover:shadow-md hover:border-red-300 transition"
    >
      <div className="flex justify-center">
        <div
          className={`w-24 h-24 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden shadow ring-4 ring-white`}
        >
          {member.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.photoUrl} alt={display} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-3xl font-bold opacity-95">{initials(member.clergyName)}</span>
          )}
        </div>
      </div>
      <div className="mt-3 text-center">
        <h4 className="font-semibold text-sm text-gray-900">{display}</h4>
        {member.assignmentName && (
          <p className="text-xs text-gray-500 mt-1 truncate">{member.assignmentName}</p>
        )}
      </div>
    </Link>
  );
}
