"use client";

// Top-level Transfers route. The navbar points here. Internally it
// reuses the Board + ManualSchedule components that already live under
// /diocese/[id]/transfers — those components also still work via their
// original URL (Board accepts an optional `dioceseId` prop and falls
// back to useParams when missing). For now we hard-bind to the single
// default diocese; once we go multi-diocese we'll surface a switcher
// here without moving the route.

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import Board from "@/app/diocese/[id]/transfers/Board";
import ManualSchedule from "@/app/diocese/[id]/transfers/ManualSchedule";

const DEFAULT_DIOCESE_ID = Number(process.env.NEXT_PUBLIC_DEFAULT_DIOCESE_ID ?? "1");

function TransfersInner() {
  const params = useSearchParams();
  const view = params?.get("view");
  if (view === "manual") return <ManualSchedule dioceseId={DEFAULT_DIOCESE_ID} />;
  return <Board dioceseId={DEFAULT_DIOCESE_ID} />;
}

export default function TransfersPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      <Suspense fallback={<div className="container mx-auto px-6 py-6 text-gray-500">Loading…</div>}>
        <TransfersInner />
      </Suspense>
    </div>
  );
}
