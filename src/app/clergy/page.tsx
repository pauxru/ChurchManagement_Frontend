import { Navbar } from "@/components/Navbar";
import { ClergyView, type ClergyDto } from "./ClergyView";
import { serverApiUrl } from "@/lib/serverFetch";

export const metadata = { title: "Clergy" };
export const dynamic = "force-dynamic";

async function loadClergy(): Promise<ClergyDto[]> {
  try {
    const res = await fetch(serverApiUrl("/public/clergy"), { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as ClergyDto[];
  } catch (e) {
    console.error("[loadClergy] fetch failed:", e);
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
