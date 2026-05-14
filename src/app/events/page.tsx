import { Navbar } from "@/components/Navbar";
import { serverApiUrl } from "@/lib/serverFetch";

export const metadata = { title: "Events" };
export const dynamic = "force-dynamic";

interface EventDto {
  eventId: number;
  eventTitle: string;
  eventCategory: string | null;
  eventStartDate: string;
  eventStartTime: string;
  eventEndDate: string;
  eventEndTime: string;
  eventLocationChurch: string;
  eventTheme: string | null;
  eventDescription: string;
}

async function loadEvents(): Promise<EventDto[]> {
  try {
    const res = await fetch(serverApiUrl("/public/events"), { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as EventDto[];
  } catch (e) {
    console.error("[loadEvents] fetch failed:", e);
    return [];
  }
}

function formatDate(iso: string): { day: string; month: string } {
  const d = new Date(iso + "T00:00:00Z");
  return {
    day: String(d.getUTCDate()),
    month: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
  };
}

export default async function EventsPage() {
  const events = await loadEvents();
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main className="container mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-red-900">Upcoming Events</h1>
        <p className="mt-2 text-gray-600">{events.length} events scheduled.</p>

        {events.length === 0 ? (
          <p className="mt-10 text-gray-500">No upcoming events.</p>
        ) : (
          <ul className="mt-8 divide-y divide-gray-200 border border-gray-200 rounded-lg">
            {events.map((e) => {
              const { day, month } = formatDate(e.eventStartDate);
              return (
                <li key={e.eventId} className="p-5 flex gap-5 items-start">
                  <div className="w-16 text-center bg-red-50 text-red-900 rounded p-2 shrink-0">
                    <div className="text-2xl font-bold leading-none">{day}</div>
                    <div className="text-xs uppercase tracking-wide">{month}</div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h2 className="font-semibold text-lg">{e.eventTitle}</h2>
                      {e.eventCategory && (
                        <span className="text-xs bg-yellow-100 text-yellow-900 px-2 py-0.5 rounded">
                          {e.eventCategory}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {e.eventLocationChurch} · {e.eventStartTime.slice(0, 5)}–
                      {e.eventEndTime.slice(0, 5)}
                    </p>
                    {e.eventTheme && (
                      <p className="text-sm text-gray-700 mt-2 italic">{e.eventTheme}</p>
                    )}
                    {e.eventDescription && (
                      <p className="text-sm text-gray-700 mt-1">{e.eventDescription}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
