"use client";

// Transfers landing page. Renders the drag-and-drop board by default
// (Phase 4 of the transfers-board spec). The legacy manual-schedule
// form is preserved verbatim and reachable via `?view=manual` for
// promotions / demotions, which the board explicitly doesn't support.

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import Board from "./Board";
import ManualSchedule from "./ManualSchedule";

function TransfersInner() {
  const params = useSearchParams();
  const view = params?.get("view");
  if (view === "manual") return <ManualSchedule />;
  return <Board />;
}

export default function TransfersPage() {
  // useSearchParams must be wrapped in a Suspense boundary for the
  // App Router prerender step (Next 15 requirement).
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Suspense fallback={<div className="container mx-auto px-6 py-6 text-gray-500">Loading…</div>}>
        <TransfersInner />
      </Suspense>
    </div>
  );
}
