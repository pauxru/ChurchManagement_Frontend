import { Navbar } from "@/components/Navbar";
import { serverApiUrl } from "@/lib/serverFetch";

export const metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

interface AnnouncementDto {
  announcementId: number;
  announcementTitle: string;
  announcementDescription: string;
  level: number;
  scopeLabel: string | null;
  postedAt: string;
}

async function loadAnnouncements(): Promise<AnnouncementDto[]> {
  try {
    const res = await fetch(serverApiUrl("/public/announcements"), { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as AnnouncementDto[];
  } catch (e) {
    console.error("[loadAnnouncements] fetch failed:", e);
    return [];
  }
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export default async function AnnouncementsPage() {
  const announcements = await loadAnnouncements();
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main className="container mx-auto px-6 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold text-red-900">Announcements</h1>
        <p className="mt-2 text-gray-600">{announcements.length} announcements.</p>

        {announcements.length === 0 ? (
          <p className="mt-10 text-gray-500">No announcements right now.</p>
        ) : (
          <ul className="mt-8 space-y-4">
            {announcements.map((a) => (
              <li
                key={a.announcementId}
                className="border border-gray-200 rounded-lg p-5 hover:shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h2 className="font-semibold text-lg">{a.announcementTitle}</h2>
                  <span className="text-xs text-gray-500">{timeAgo(a.postedAt)}</span>
                </div>
                {a.scopeLabel && (
                  <p className="mt-1 text-xs uppercase tracking-wide text-red-700">
                    {a.scopeLabel}
                  </p>
                )}
                <p className="mt-3 text-gray-700 whitespace-pre-line">{a.announcementDescription}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
