import { Navbar } from "@/components/Navbar";
import { ClergyView, type ClergyDto } from "./ClergyView";

export const metadata = { title: "Clergy" };
export const revalidate = 120;

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

export default async function ClergyPage() {
  const clergy = await loadClergy();
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main className="container mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-red-900">Clergy</h1>
        <p className="mt-2 text-gray-600">
          {clergy.length} clergy across the diocese, grouped by rank from most
          senior down.
        </p>
        <ClergyView clergy={clergy} />
      </main>
    </div>
  );
}
