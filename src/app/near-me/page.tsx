import { Navbar } from "@/components/Navbar";

export const metadata = { title: "AIPCA Church Near Me" };
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

export default async function NearMePage() {
  const churches = await loadChurches();
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <header className="bg-gradient-to-b from-red-800 to-red-700 text-white">
        <div className="container mx-auto px-6 py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold">Find an AIPCA Church Near You</h1>
          <p className="mt-3 text-red-50 max-w-2xl mx-auto">
            Every AIPCA Local Church in Gatundu Diocese, with the parish and address.
            Visit any of them — services are open to all.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-lg p-4 mb-8 text-sm">
          <strong>Coming soon:</strong> an interactive map view. For now, browse the list
          below or call the parish office for directions.
        </div>

        {churches.length === 0 ? (
          <p className="text-gray-500">No churches to show yet.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {churches.map((c) => (
              <li
                key={c.localChurchId}
                className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow flex gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-800 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M12 2 4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h2 className="font-semibold text-lg">{c.localChurchName}</h2>
                    <span className="text-xs font-mono bg-yellow-100 text-yellow-900 px-2 py-1 rounded">
                      {c.localChurchCode}
                    </span>
                  </div>
                  {c.parishName && (
                    <p className="text-sm text-gray-600 mt-0.5">
                      {c.parishName}
                      {c.dioceseName ? ` · ${c.dioceseName} Diocese` : ""}
                    </p>
                  )}
                  {c.address ? (
                    <p className="text-sm text-gray-700 mt-2">{c.address}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic mt-2">Address not yet listed</p>
                  )}
                  {c.inChargePastorName && (
                    <p className="text-sm mt-2">
                      <span className="text-gray-500">Pastor: </span>
                      <span className="font-medium">{c.inChargePastorName}</span>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="bg-gray-900 text-gray-300 py-6 text-center mt-10">
        <p className="text-sm">
          © {new Date().getFullYear()} Gatundu Diocese · AIPCA Nairobi Archdiocese
        </p>
      </footer>
    </div>
  );
}
