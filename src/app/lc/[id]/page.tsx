"use client";

import { useParams } from "next/navigation";

const TILES = [
  { slug: "plans", label: "Plans" },
  { slug: "cess", label: "Cess submissions" },
  { slug: "finances", label: "Finances" },
  { slug: "communication", label: "Communication" },
  { slug: "groups", label: "Groups" },
  { slug: "fellowships", label: "Fellowships" },
  { slug: "minutes", label: "Meeting minutes" },
  { slug: "shared-with-bishop", label: "Shared with Bishop" },
];

export default function LcOverviewPage() {
  const params = useParams<{ id: string }>();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {TILES.map((t) => (
        <a
          key={t.slug}
          href={`/lc/${params?.id}/${t.slug}`}
          className="block bg-white rounded shadow p-4 hover:bg-blue-50"
        >
          <div className="font-semibold">{t.label}</div>
        </a>
      ))}
    </div>
  );
}
