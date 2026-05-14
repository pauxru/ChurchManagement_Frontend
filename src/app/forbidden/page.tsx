"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useSession } from "next-auth/react";

function ForbiddenBody() {
  const params = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();

  const reason = params?.get("reason") ?? "default";
  const target = params?.get("target");

  const message = (() => {
    switch (reason) {
      case "no-admin":
        return "You need admin scope to view this page. Ask a National Admin or Bishop to grant you the appropriate AdminAssignment.";
      case "wrong-lc":
        return target
          ? `You don't belong to ${target}. Each Local Church workspace is restricted to that LC's verified officials, the Bishop, and Diocesan+ admins.`
          : "You can only access your own Local Church workspace. Each LC workspace is restricted to that LC's verified officials, the Bishop, and Diocesan+ admins.";
      case "not-bishop":
        return "Only Bishops (and higher admins) can view the diocese overview.";
      default:
        return "You don't have permission to view this page.";
    }
  })();

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="bg-red-700 text-white px-6 py-4">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="text-sm text-red-100 mt-1">You can&apos;t view this page with your current role.</p>
      </div>
      <div className="px-6 py-5 space-y-4">
        <p className="text-gray-700 leading-relaxed">{message}</p>

        {session?.user && (
          <div className="bg-gray-50 border border-gray-200 rounded p-4 text-sm">
            <p><span className="text-gray-500">Signed in as:</span> <span className="font-medium">{session.user.email ?? session.user.name}</span></p>
            {session.profile && (
              <p className="mt-1">
                <span className="text-gray-500">Your role:</span>{" "}
                <span className="font-medium">{session.profile.roleLabel?.label ?? "Unverified"}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={() => router.back()}
            className="bg-red-700 text-white px-5 py-2 rounded font-medium hover:bg-red-600"
          >
            Go back
          </button>
          <Link
            href="/"
            className="border border-gray-300 px-5 py-2 rounded font-medium text-gray-700 hover:bg-gray-50"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <Suspense fallback={<div className="text-center text-gray-500">Loading…</div>}>
          <ForbiddenBody />
        </Suspense>
      </div>
    </div>
  );
}
