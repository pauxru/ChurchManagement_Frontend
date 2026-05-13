import { Navbar } from "@/components/Navbar";
import { VerseOfTheDay } from "@/components/VerseOfTheDay";

export const revalidate = 300;

interface ClergyDto {
  clergyId: number;
  clergyName: string;
  rank: number;
  rankLabel: string;
  level: number;
  assignmentName: string | null;
  ordinationYear: number | null;
}

async function loadBishops(): Promise<ClergyDto[]> {
  const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";
  try {
    const res = await fetch(`${base}/public/clergy`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const all = (await res.json()) as ClergyDto[];
    return all.filter((c) => c.rankLabel === "Bishop");
  } catch {
    return [];
  }
}

function bishopInitials(name: string): string {
  const cleaned = name.replace(/^Bishop\s+/i, "").replace(/\([^)]*\)/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "B";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "B";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const THEME_OF_THE_YEAR = {
  year: new Date().getFullYear(),
  title: "Rooted in Christ, Reaching the Nations",
  verse: "Colossians 2:6–7",
};

export default async function Home() {
  const bishops = await loadBishops();
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      {/* Hero */}
      <header className="bg-gradient-to-b from-red-800 to-red-700 text-white">
        <div className="container mx-auto px-6 py-20 text-center">
          <p className="uppercase tracking-widest text-yellow-300 text-sm font-semibold">
            AIPCA · Nairobi Archdiocese
          </p>
          <h1 className="mt-3 text-4xl md:text-5xl font-extrabold">
            Gatundu Diocese
          </h1>
          <p className="mt-5 text-lg md:text-xl text-red-50 max-w-2xl mx-auto">
            A diocese of the African Independent Pentecostal Church of Africa.
            Worshipping, growing, and serving our community in Gatundu.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/near-me"
              className="bg-yellow-400 text-red-900 font-semibold px-6 py-3 rounded shadow hover:bg-yellow-300"
            >
              Find a church near you
            </a>
            <a
              href="#worship"
              className="bg-white/10 text-white border border-white/30 font-semibold px-6 py-3 rounded hover:bg-white/20"
            >
              Service times
            </a>
          </div>
        </div>
      </header>

      {/* Theme of the year */}
      <section className="py-8 bg-yellow-50 border-y border-yellow-200">
        <div className="container mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-widest text-yellow-900 font-semibold">
            Theme for {THEME_OF_THE_YEAR.year}
          </p>
          <h2 className="mt-2 text-2xl md:text-3xl font-bold text-red-900">
            &ldquo;{THEME_OF_THE_YEAR.title}&rdquo;
          </h2>
          <p className="mt-1 text-sm text-gray-700">{THEME_OF_THE_YEAR.verse}</p>
        </div>
      </section>

      {/* Verse of the day */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="text-center text-3xl font-bold text-red-800">Verse of the Day</h2>
          <VerseOfTheDay />
        </div>
      </section>

      {/* Mission */}
      <section id="mission" className="py-16 bg-gray-50">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-red-800">Our Mission</h2>
          <p className="mt-5 text-gray-700 leading-relaxed text-lg">
            To proclaim the gospel of Jesus Christ, disciple every believer,
            and serve our community through compassionate ministry —
            standing firm in the apostolic faith and the Pentecostal witness
            of the African Independent Pentecostal Church of Africa.
          </p>
        </div>
      </section>

      {/* Bishops */}
      <section id="bishops" className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-red-800">Our Bishops</h2>
          <p className="mt-3 text-center text-gray-600 max-w-2xl mx-auto">
            Gatundu Diocese is shepherded by our Bishops, who lead worship,
            ordain clergy, and represent the diocese in the Nairobi Archdiocese.
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {(bishops.length > 0 ? bishops : [
              { clergyId: -1, clergyName: "Bishop (To be announced)", assignmentName: "Gatundu Diocese" },
              { clergyId: -2, clergyName: "Bishop (To be announced)", assignmentName: "Gatundu Diocese" },
            ]).map((b) => (
              <div key={b.clergyId} className="bg-gray-50 rounded-lg shadow-sm overflow-hidden border border-gray-200">
                <div className="aspect-[4/3] bg-gradient-to-br from-red-700 to-red-900 flex items-center justify-center">
                  <span className="text-white text-6xl font-bold opacity-80">
                    {bishopInitials(b.clergyName)}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg text-gray-900">{b.clergyName}</h3>
                  <p className="text-sm text-red-700 font-medium mt-1">Bishop</p>
                  {b.assignmentName && (
                    <p className="text-sm text-gray-600 mt-0.5">{b.assignmentName}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ministries: Worship, Bible Study, Prayers */}
      <section id="worship" className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-red-800">Worship With Us</h2>
          <p className="mt-3 text-center text-gray-600 max-w-2xl mx-auto">
            Join us in worship, study, and prayer across our local churches.
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-800 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M12 2 4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-red-900">Sunday Worship</h3>
              <p className="mt-2 text-gray-700 text-sm leading-relaxed">
                Main worship service every Sunday morning at all our Local Churches.
                Praise, prayer, the Word, and Holy Communion the first Sunday of the month.
              </p>
              <p className="mt-3 text-xs text-gray-500">9:00 AM – 12:00 PM · All ages welcome</p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-800 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M4 4h13a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4zm2 2v11a1 1 0 0 0 1 1h11V7a1 1 0 0 0-1-1H6z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-red-900">Bible Study</h3>
              <p className="mt-2 text-gray-700 text-sm leading-relaxed">
                Weekly Bible study in every Local Church and through our fellowships —
                drawing from Scripture to grow disciples and equip believers.
              </p>
              <p className="mt-3 text-xs text-gray-500">Wednesdays · 6:00 PM</p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-800 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path d="M12 2c-1 0-2 .8-2 2v2c0 .6.4 1 1 1v3l-4 4v2h10v-2l-4-4V7c.6 0 1-.4 1-1V4c0-1.2-1-2-2-2zm-5 16h10v4H7v-4z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-red-900">Prayer Cells</h3>
              <p className="mt-2 text-gray-700 text-sm leading-relaxed">
                Small-group prayer cells meet during the week in homes and churches.
                Intercession, fellowship, and pastoral care for every member.
              </p>
              <p className="mt-3 text-xs text-gray-500">Fridays · 5:00 PM</p>
            </div>
          </div>
        </div>
      </section>

      {/* Get involved */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-red-800">Get Involved</h2>
          <p className="mt-5 text-gray-700 leading-relaxed">
            Whether you&apos;re new to AIPCA or have worshipped with us for years,
            there&apos;s a place for you. Join a fellowship, serve in a ministry,
            or simply visit one of our Local Churches this Sunday.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/near-me"
              className="bg-red-700 text-white font-semibold px-6 py-3 rounded shadow hover:bg-red-600"
            >
              Find a church
            </a>
            <a
              href="#contact"
              className="bg-yellow-400 text-red-900 font-semibold px-6 py-3 rounded shadow hover:bg-yellow-300"
            >
              Contact the diocese
            </a>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 bg-red-800 text-white">
        <div className="container mx-auto px-6 text-center max-w-2xl">
          <h2 className="text-3xl font-bold">Get In Touch</h2>
          <p className="mt-4 text-red-50">
            For questions about Gatundu Diocese, joining a Local Church, or partnering
            in ministry, reach out to the diocesan office.
          </p>
          <p className="mt-3 text-yellow-300 font-medium">
            <a href="mailto:office@aipca-gatundu.example" className="hover:underline">
              office@aipca-gatundu.example
            </a>
          </p>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-300 py-6 text-center">
        <p className="text-sm">
          © {new Date().getFullYear()} Gatundu Diocese · AIPCA Nairobi Archdiocese
        </p>
      </footer>
    </div>
  );
}
