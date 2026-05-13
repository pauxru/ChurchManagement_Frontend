"use client";

import Link from "next/link";
import { UserMenu } from "./UserMenu";
import { RolePill } from "./RolePill";

export function Navbar() {
  return (
    <nav className="bg-red-800 text-white shadow sticky top-0 z-40">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <ul className="hidden md:flex items-center gap-1 text-sm">
          <li><Link href="/" className="px-3 py-2 hover:bg-white/10 rounded">Home</Link></li>
          <li><a href="#about" className="px-3 py-2 hover:bg-white/10 rounded">About</a></li>
          <li><a href="#bishops" className="px-3 py-2 hover:bg-white/10 rounded">Bishops</a></li>
          <li><a href="#contact" className="px-3 py-2 hover:bg-white/10 rounded">Contact</a></li>
        </ul>

        <div className="flex items-center gap-3">
          <RolePill />
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
