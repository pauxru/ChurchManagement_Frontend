"use client";

// Wizard shell — Navbar + sticky three-step stepper + WizardProvider.
// Every /transfers/* route lives under this layout so the draft state
// persists when the bishop navigates between Page 1 / Page 2 / Review.
//
// The stepper doesn't gate navigation (per spec: future steps are still
// clickable). Active step gets a red underline; completed steps are
// bolded; future steps are muted but clickable.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { WizardProvider } from "./wizard-context";

interface StepDef {
  href: string;
  label: string;
}

const STEPS: StepDef[] = [
  { href: "/transfers", label: "Pastors" },
  { href: "/transfers/lc", label: "LCs" },
  { href: "/transfers/review", label: "Review" },
];

// Determine which step the current pathname belongs to. Exact match for
// /transfers (so /transfers/lc doesn't double-light), prefix match for
// the others.
function stepIndexFor(pathname: string | null): number {
  if (!pathname) return 0;
  if (pathname === "/transfers" || pathname === "/transfers/") return 0;
  if (pathname.startsWith("/transfers/lc")) return 1;
  if (pathname.startsWith("/transfers/review")) return 2;
  return 0;
}

export default function TransfersWizardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const active = stepIndexFor(pathname);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      <WizardProvider>
        <nav
          aria-label="Transfers wizard steps"
          className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm"
        >
          <ol className="container mx-auto flex items-center gap-1 sm:gap-4 px-4 py-3 text-sm">
            {STEPS.map((step, idx) => {
              const isActive = idx === active;
              const isCompleted = idx < active;
              // Style precedence: active > completed > muted. Every item is
              // a Link so future steps remain navigable.
              const tone = isActive
                ? "text-red-700 font-semibold border-b-2 border-red-600 pb-0.5"
                : isCompleted
                  ? "text-gray-900 font-semibold hover:text-red-700"
                  : "text-gray-400 hover:text-gray-700";
              const numberTone = isActive
                ? "border-red-600 text-red-700"
                : isCompleted
                  ? "border-gray-700 text-gray-900"
                  : "border-gray-300 text-gray-400";
              return (
                <li key={step.href} className="flex items-center gap-1 sm:gap-4">
                  <Link href={step.href} className={`px-1 transition-colors ${tone}`}>
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full border text-[10px] mr-1.5 align-middle ${numberTone}`}
                    >
                      {idx + 1}
                    </span>
                    {step.label}
                  </Link>
                  {idx < STEPS.length - 1 && (
                    <span aria-hidden className="text-gray-300">/</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        {children}
      </WizardProvider>
    </div>
  );
}
