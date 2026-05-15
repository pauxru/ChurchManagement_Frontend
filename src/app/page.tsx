import { Navbar } from "@/components/Navbar";
import { VerseOfTheDay } from "@/components/VerseOfTheDay";
import { LeadershipCard } from "@/components/LeadershipCard";
import { serverApiUrl } from "@/lib/serverFetch";

// Home page server-renders every request so admin edits to bishops /
// clergy / theme / etc. show up immediately instead of waiting for the
// ISR cache to expire. The fetch payload is tiny — there's no perf
// reason to cache it.
export const dynamic = "force-dynamic";

interface ClergyDto {
  clergyId: number;
  clergyName: string;
  rank: number;
  rankLabel: string;
  salutation: string;
  level: number;
  assignmentName: string | null;
  ordinationYear: number | null;
  photoUrl: string | null;
}

interface Leadership {
  presidingArchbishop: ClergyDto | null;
  archdioceseArchbishop: ClergyDto | null;
  gatunduBishops: ClergyDto[];
}

async function loadLeadership(): Promise<Leadership> {
  const empty: Leadership = { presidingArchbishop: null, archdioceseArchbishop: null, gatunduBishops: [] };
  try {
    const res = await fetch(serverApiUrl("/public/clergy"), { cache: "no-store" });
    if (!res.ok) {
      console.error("[loadLeadership] /public/clergy returned", res.status);
      return empty;
    }
    const all = (await res.json()) as ClergyDto[];
    return {
      presidingArchbishop: all.find((c) => c.rankLabel === "PresidingArchbishop") ?? null,
      archdioceseArchbishop: all.find((c) => c.rankLabel === "ArchBishop") ?? null,
      gatunduBishops: all.filter((c) => c.rankLabel === "Bishop"),
    };
  } catch (e) {
    console.error("[loadLeadership] fetch failed:", e);
    return empty;
  }
}


const THEME_OF_THE_YEAR = {
  year: new Date().getFullYear(),
  title: "Rooted in Christ, Reaching the Nations",
  verse: "Colossians 2:6–7",
};

export default async function Home() {
  const leadership = await loadLeadership();
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />

      {/* Hero */}
      <header className="bg-gradient-to-b from-red-800 to-red-700 text-white">
        <div className="container mx-auto px-6 py-16 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/aipca-logo.png"
            alt="AIPCA"
            className="mx-auto w-28 h-auto drop-shadow-lg"
          />
          <p className="mt-6 uppercase tracking-widest text-yellow-300 text-sm font-semibold">
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

      {/* Leadership hierarchy */}
      <section id="bishops" className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-red-800">Our Leadership</h2>
          <p className="mt-3 text-center text-gray-600 max-w-2xl mx-auto">
            From the national leadership of AIPCA down to the Bishops who shepherd
            Gatundu Diocese.
          </p>

          {/* Tier 1 — Presiding Archbishop (also Archbishop of Nairobi if
              the same person holds both seats — show once, label both). */}
          {(() => {
            const pres = leadership.presidingArchbishop;
            const arch = leadership.archdioceseArchbishop;
            const samePerson =
              pres && arch && pres.clergyName.trim() === arch.clergyName.trim();
            return (
              <>
                <div className="mt-12">
                  <p className="text-center text-xs uppercase tracking-widest text-yellow-700 font-semibold">
                    Presiding Archbishop · AIPCA National
                  </p>
                  <div className="mt-4 max-w-sm mx-auto">
                    <LeadershipCard
                      clergy={pres}
                      fallbackName="To be announced"
                      fallbackAssignment="National Church"
                      titleLabel="Presiding Archbishop"
                      secondaryTitle={samePerson ? "also Archbishop of Nairobi Archdiocese" : null}
                      size="lg"
                      gradient="from-yellow-500 to-yellow-700"
                    />
                  </div>
                </div>

                {!samePerson && (
                  <>
                    <div className="flex justify-center my-6">
                      <div className="w-0.5 h-10 bg-gradient-to-b from-yellow-600 to-red-700" />
                    </div>
                    <div>
                      <p className="text-center text-xs uppercase tracking-widest text-red-700 font-semibold">
                        Archbishop · Nairobi Archdiocese
                      </p>
                      <div className="mt-4 max-w-sm mx-auto">
                        <LeadershipCard
                          clergy={arch}
                          fallbackName="To be announced"
                          fallbackAssignment="Nairobi Archdiocese"
                          titleLabel="Archbishop"
                          size="md"
                          gradient="from-red-700 to-red-900"
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            );
          })()}

          <div className="flex justify-center my-6">
            <div className="w-0.5 h-10 bg-gradient-to-b from-red-700 to-red-900" />
          </div>

          {/* Tier 3 — Gatundu Bishops */}
          <div>
            <p className="text-center text-xs uppercase tracking-widest text-red-900 font-semibold">
              Bishops · Gatundu Diocese
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {(leadership.gatunduBishops.length > 0 ? leadership.gatunduBishops : [
                { clergyId: -1, clergyName: "Bishop (To be announced)", assignmentName: "Gatundu Diocese" } as ClergyDto,
                { clergyId: -2, clergyName: "Bishop (To be announced)", assignmentName: "Gatundu Diocese" } as ClergyDto,
              ]).map((b) => (
                <LeadershipCard
                  key={b.clergyId}
                  clergy={b}
                  titleLabel="Bishop"
                  size="sm"
                  gradient="from-red-800 to-red-950"
                />
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Parishes */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="text-3xl font-bold text-center text-red-800">Our Parishes</h2>
          <p className="mt-3 text-center text-gray-600 max-w-2xl mx-auto">
            Gatundu Diocese is organised into 13 parishes spread across the
            sub-county. The diocesan headquarters is at Gatundu Cathedral.
          </p>
          <ul className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              "Gakoe", "Mithurumbi", "Kiamwathi", "Gachoka", "Kiamwangi",
              "Nembu", "Kiamwori", "Gachika", "Gikindu", "Karuri",
              "Kairi", "Kamunyaka", "Kiganjo",
            ].map((p) => (
              <li
                key={p}
                className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-center text-sm font-medium text-gray-800"
              >
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-xs text-gray-400">
            Headquarters: <span className="font-semibold">Gatundu Cathedral</span> (Gakoe Parish)
          </p>
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

      <footer className="bg-gray-900 text-gray-300 py-6 text-center space-y-1">
        <p className="text-sm">
          © {new Date().getFullYear()} Gatundu Diocese · AIPCA Nairobi Archdiocese
        </p>
        <p className="text-xs text-gray-500">
          Made with <span aria-hidden>❤️</span><span className="sr-only">love</span> by Pawad Technologies ltd
        </p>
      </footer>
    </div>
  );
}
