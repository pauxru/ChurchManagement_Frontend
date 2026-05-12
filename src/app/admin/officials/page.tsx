"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

// Officials listing — by design, the backend doesn't yet expose a generic
// /Admin/officials list endpoint (that's Phase 5 follow-up). This page is a
// stub linking to the per-LC official views via the Bishop overview.
export default function AdminOfficialsPage() {
  const { data: session, status } = useSession();
  if (status === "loading") return <div className="p-6">Loading...</div>;
  if (!session?.user) return <div className="p-6">Please sign in.</div>;

  return (
    <div className="container mx-auto px-6 py-6 space-y-4">
      <h1 className="text-2xl font-bold">Officials</h1>
      <p className="text-gray-600">
        Use the Bishop overview to drill into each local church&apos;s officials.
      </p>
      <Link href="/admin" className="text-blue-700 underline">← Back to admin dashboard</Link>
    </div>
  );
}
