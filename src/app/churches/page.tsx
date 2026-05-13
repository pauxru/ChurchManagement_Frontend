import { Navbar } from "@/components/Navbar";

export const metadata = { title: "Local Churches" };
export const revalidate = 120;

interface LocalChurchDto {
  localChurchId: number;
  localChurchCode: string;
  localChurchName: string;
  parishName: string | null;
  dioceseName: string | null;
  address: string | null;
  inChargePastorName: string | null;
  status: string;
}

async function loadChurches(): Promise<LocalChurchDto[]> {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";
  try {
    const res = await fetch(`${base}/public/local-churches`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    return (await res.json()) as LocalChurchDto[];
  } catch {
    return [];
  }
}

export default async function ChurchesPage() {
  const churches = await loadChurches();
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main className="container mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-red-900">Local Churches</h1>
        <p className="mt-2 text-gray-600">
          All Local Churches in Gatundu Diocese — {churches.length} listed.
        </p>

        {churches.length === 0 ? (
          <p className="mt-10 text-gray-500">No Local Churches to show yet.</p>
        ) : (
          <ul className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {churches.map((c) => (
              <li
                key={c.localChurchId}
                className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-lg">{c.localChurchName}</h2>
                  <span className="text-xs font-mono bg-yellow-100 text-yellow-900 px-2 py-1 rounded">
                    {c.localChurchCode}
                  </span>
                </div>
                {c.parishName && (
                  <p className="mt-1 text-sm text-gray-600">
                    {c.parishName}
                    {c.dioceseName ? ` · ${c.dioceseName} Diocese` : ""}
                  </p>
                )}
                {c.address && <p className="mt-2 text-sm text-gray-700">{c.address}</p>}
                {c.inChargePastorName && (
                  <p className="mt-3 text-sm">
                    <span className="text-gray-500">In-charge: </span>
                    <span className="font-medium">{c.inChargePastorName}</span>
                  </p>
                )}
                <span className="mt-3 inline-block text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
