"use client";

import Link from "next/link";
import { UserMenu } from "./UserMenu";

// Diocese-branded top navigation. Public links on the left; UserMenu on the right.
// LC/Admin/Diocese links live INSIDE UserMenu's modal so the top bar stays clean.
export function Navbar() {
  return (
    <nav className="bg-red-800 text-white shadow sticky top-0 z-40">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-yellow-400 text-red-900 font-bold">G</span>
          <div className="leading-tight">
            <div className="font-bold">Gatundu Diocese</div>
            <div className="text-xs text-red-100/80 hidden sm:block">AIPCA · Nairobi Archdiocese</div>
          </div>
        </Link>

        <ul className="hidden md:flex items-center gap-1 text-sm">
          <li><Link href="/" className="px-3 py-2 hover:bg-white/10 rounded">Home</Link></li>
          <li><a href="#about" className="px-3 py-2 hover:bg-white/10 rounded">About</a></li>
          <li><a href="#bishops" className="px-3 py-2 hover:bg-white/10 rounded">Bishops</a></li>
          <li><a href="#contact" className="px-3 py-2 hover:bg-white/10 rounded">Contact</a></li>
        </ul>

        <UserMenu />
      </div>
    </nav>
  );
}
