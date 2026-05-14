import { Navbar } from "@/components/Navbar";
import { ChurchesView, type LocalChurchDto } from "./ChurchesView";

export const metadata = { title: "Local Churches" };
export const revalidate = 120;

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
          All Local Churches in Gatundu Diocese, grouped by parish. Click any to open its workspace.
        </p>
        <ChurchesView churches={churches} />
      </main>
    </div>
  );
}
