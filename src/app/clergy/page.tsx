import { Navbar } from "@/components/Navbar";

export const metadata = { title: "Clergy" };
export const revalidate = 120;

interface ClergyDto {
  clergyId: number;
  clergyName: string;
  rank: number;
  rankLabel: string;
  level: number;
  assignmentName: string | null;
  ordinationYear: number | null;
}

const RANK_LABELS: Record<string, string> = {
  PresidingArchbishop: "Presiding Archbishop",
  ArchBishop: "Archbishop",
  Bishop: "Bishop",
  ArchDeacon: "Archdeacon",
  Pastor: "Pastor",
  Deacon: "Deacon",
  ChurchLeader: "Church Leader",
  Evangelist: "Evangelist",
};

async function loadClergy(): Promise<ClergyDto[]> {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";
  try {
    const res = await fetch(`${base}/public/clergy`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    return (await res.json()) as ClergyDto[];
  } catch {
    return [];
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function ClergyPage() {
  const clergy = await loadClergy();
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main className="container mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-red-900">Clergy</h1>
        <p className="mt-2 text-gray-600">{clergy.length} clergy across the diocese.</p>

        {clergy.length === 0 ? (
          <p className="mt-10 text-gray-500">No clergy to show yet.</p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {clergy.map((c) => (
              <li
                key={c.clergyId}
                className="border border-gray-200 rounded-lg p-5 text-center hover:shadow-md transition-shadow"
              >
                <div className="mx-auto w-16 h-16 rounded-full bg-red-100 text-red-800 flex items-center justify-center font-bold text-xl">
                  {initials(c.clergyName)}
                </div>
                <h2 className="mt-3 font-semibold">{c.clergyName}</h2>
                <p className="text-sm text-red-700 font-medium">
                  {RANK_LABELS[c.rankLabel] ?? c.rankLabel}
                </p>
                {c.assignmentName && (
                  <p className="mt-1 text-sm text-gray-600">{c.assignmentName}</p>
                )}
                {c.ordinationYear && (
                  <p className="mt-2 text-xs text-gray-500">Ordained {c.ordinationYear}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
