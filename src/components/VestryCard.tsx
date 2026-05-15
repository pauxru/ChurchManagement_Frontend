import Link from "next/link";
import { clergyDisplayName, rankGradient } from "@/lib/clergyDisplay";

export interface VestryMember {
  clergyId: number;
  clergyName: string;
  rankLabel: string;
  salutation: string;
  assignmentName: string | null;
  photoUrl: string | null;
  // Surfaced by the backend on the in-charge Pastor / Deacon of an assignment.
  // Optional so older API responses (pre-IsInCharge) still render gracefully.
  isInCharge?: boolean;
}

function initials(name: string): string {
  const parts = name.replace(/\([^)]*\)/g, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  // For a single-name input ("Samuel"), prefer the first two letters
  // ("SA") so the circle never reads as a lone initial.
  if (parts.length === 1) return (parts[0].slice(0, 2) || parts[0][0] || "?").toUpperCase();
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
      className="relative block bg-white border border-gray-200 rounded-xl px-3 pt-4 pb-3 hover:shadow-lg hover:border-red-300 transition"
    >
      {member.isInCharge && (
        <span
          className="absolute top-1.5 right-1.5 bg-yellow-100 text-yellow-900 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full shadow-sm"
          title="Lead clergy for this assignment"
        >
          In-charge
        </span>
      )}
      <div className="flex justify-center">
        <div
          className={`w-32 h-32 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center overflow-hidden shadow-md ring-4 ring-white`}
        >
          {member.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.photoUrl} alt={display} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white text-4xl font-bold opacity-95">{initials(member.clergyName)}</span>
          )}
        </div>
      </div>
      <div className="mt-2 text-center">
        <h4 className="font-semibold text-sm text-gray-900 leading-tight">{display}</h4>
        {member.assignmentName && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{member.assignmentName}</p>
        )}
      </div>
    </Link>
  );
}
