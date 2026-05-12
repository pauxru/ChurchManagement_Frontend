"use client";

import { Navbar } from "@/components/Navbar";

// Gatundu Diocese landing page. Public — no auth required to view.
// All user actions are gated behind sign-in via the UserMenu in the Navbar.
export default function Home() {
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
            Welcome to Gatundu Diocese
          </h1>
          <p className="mt-5 text-lg md:text-xl text-red-50 max-w-2xl mx-auto">
            One place for our local churches, our officials, and our shared
            mission across Gatundu. Track plans, cess contributions, fellowships,
            and announcements — all visible to our Bishops and accountable to our flock.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <a
              href="#about"
              className="bg-yellow-400 text-red-900 font-semibold px-6 py-3 rounded shadow hover:bg-yellow-300"
            >
              Learn more
            </a>
            <a
              href="#contact"
              className="bg-white/10 text-white border border-white/30 font-semibold px-6 py-3 rounded hover:bg-white/20"
            >
              Get in touch
            </a>
          </div>
        </div>
      </header>

      {/* About */}
      <section id="about" className="py-16 bg-white">
        <div className="container mx-auto px-6 max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-red-800">About Gatundu Diocese</h2>
          <p className="mt-5 text-gray-700 leading-relaxed">
            Gatundu Diocese is part of the Nairobi Archdiocese within the
            Africa Independent Pentecostal Church of Africa (AIPCA).
            We serve communities across Gatundu through our local churches,
            led by our Bishops and supported by clergy, officials, and
            volunteer leadership at every level.
          </p>
          <p className="mt-4 text-gray-700 leading-relaxed">
            This platform brings together every Local Church in Gatundu —
            our plans, our finances, our groups, our fellowships, and our
            meeting minutes — so we can lead with transparency and serve
            with consistency.
          </p>
        </div>
      </section>

      {/* Bishops */}
      <section id="bishops" className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-red-800">Our Bishops</h2>
          <p className="mt-3 text-center text-gray-600 max-w-2xl mx-auto">
            Two co-equal Bishops lead Gatundu Diocese, with one designated as
            the In-Charge. Their names are configured by the diocesan admin
            once they are confirmed.
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              { title: "Bishop (In-Charge)", desc: "Leads the diocese alongside the second Bishop and represents Gatundu in the Nairobi Archdiocese." },
              { title: "Bishop", desc: "Co-shepherds the diocese with the In-Charge Bishop in joint ministry across all local churches." },
            ].map((b) => (
              <div key={b.title} className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-400">
                <h3 className="font-bold text-lg">{b.title}</h3>
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you can do */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-red-800">What our officials can do</h2>
          <p className="mt-3 text-center text-gray-600 max-w-2xl mx-auto">
            Verified Local Church officials sign in and manage their church&apos;s
            day-to-day on this platform.
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Plans & Events", desc: "Publish what your local church is up to — strategic plans, services, retreats, outreaches." },
              { title: "Cess Tracking", desc: "Submit monthly cess contributions with a payment reference. Diocese verifies against the bank/M-Pesa statement." },
              { title: "Groups & Fellowships", desc: "Manage committees and prayer cells, assign leaders, track membership." },
              { title: "Finances", desc: "Record tithes, offerings, and project income for your local church." },
              { title: "Meeting Minutes", desc: "Upload and share signed minutes — searchable history, accessible to the Bishop." },
              { title: "Communication", desc: "Post notices for your local church officials and members." },
            ].map((f) => (
              <div key={f.title} className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                <h3 className="font-semibold text-red-900">{f.title}</h3>
                <p className="mt-2 text-gray-700 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-16 bg-red-800 text-white">
        <div className="container mx-auto px-6 text-center max-w-2xl">
          <h2 className="text-3xl font-bold">Get in touch</h2>
          <p className="mt-4 text-red-50">
            For questions about Gatundu Diocese, joining a local church, or onboarding as
            an official, reach out to the diocesan office.
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
