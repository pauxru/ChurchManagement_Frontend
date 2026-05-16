"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";

interface AdminAssignment {
  adminAssignmentId: number;
  userAccountId: string;
  adminLevel: number;
  adminLevelID: number;
  isActive: boolean;
}

interface ScopeResponse {
  isNationalRoleAdmin: boolean;
  assignments: AdminAssignment[];
}

const LEVEL_NAMES: Record<number, string> = {
  1: "Local Church",
  2: "Parish",
  3: "Diocese",
  4: "Archdiocese",
  5: "National",
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const [scope, setScope] = useState<ScopeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<ScopeResponse>("/Admin/me/scope", token).then(setScope).catch((e) => setError(e.message));
  }, [token]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (!session?.user) return <div className="p-8">Please sign in.</div>;

  // When verification is globally disabled, every signed-in user gets the
  // full admin dashboard — matches the backend's AppPolicy bypass so the
  // UI doesn't fight the API. Set NEXT_PUBLIC_REQUIRE_VERIFICATION=true to
  // restore scope-based gating.
  const requireVerification = process.env.NEXT_PUBLIC_REQUIRE_VERIFICATION !== "false";
  const isAdmin = !requireVerification || (scope && (scope.isNationalRoleAdmin || scope.assignments.length > 0));

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Admin dashboard</h1>
      {error && <p className="text-red-700 mb-3">{error}</p>}

      {!isAdmin && scope && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
          <p>You don&apos;t currently have admin scope. Ask a National admin to grant you a role.</p>
        </div>
      )}

      {isAdmin && (
        <div className="space-y-6">
          {!requireVerification && (!scope || (!scope.isNationalRoleAdmin && scope.assignments.length === 0)) && (
            <div className="bg-gray-50 border border-gray-200 p-3 rounded text-sm text-gray-700">
              RBAC is currently disabled (<code>AppPolicy:RequireVerification=false</code>) — every signed-in user
              sees the full admin surface. Flip <code>REQUIRE_VERIFICATION=true</code> in <code>.env.deploy</code>
              once real admin assignments are in place.
            </div>
          )}
          {scope && (scope.isNationalRoleAdmin || scope.assignments.length > 0) && (
            <section>
              <h2 className="text-xl font-semibold mb-2">Your scope</h2>
              {scope.isNationalRoleAdmin && (
                <div className="bg-purple-50 border border-purple-200 p-3 rounded mb-2">
                  <strong>National admin</strong> (granted via Entra app role)
                </div>
              )}
              <ul className="space-y-2">
                {scope.assignments.map((a) => (
                  <li key={a.adminAssignmentId} className="bg-blue-50 border border-blue-200 p-3 rounded">
                    Admin of {LEVEL_NAMES[a.adminLevel]} #{a.adminLevelID}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-xl font-semibold mb-2">Manage content</h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <li>
                <Link href="/admin/local-churches" className="block bg-white shadow rounded p-4 hover:bg-gray-50">
                  <div className="font-semibold">Local Churches</div>
                  <div className="text-sm text-gray-600">Edit each church&apos;s logo, banner, service times, contact info, description. Powers the public LC page.</div>
                </Link>
              </li>
              <li>
                <Link href="/admin/clergy" className="block bg-white shadow rounded p-4 hover:bg-gray-50">
                  <div className="font-semibold">Clergy</div>
                  <div className="text-sm text-gray-600">Edit names, photos, ordination details. Photo URLs reference files in the frontend public/bishops folder.</div>
                </Link>
              </li>
              <li>
                <Link href="/admin/parishes" className="block bg-white shadow rounded p-4 hover:bg-gray-50">
                  <div className="font-semibold">Parishes</div>
                  <div className="text-sm text-gray-600">Rename parishes and edit their descriptions.</div>
                </Link>
              </li>
              <li>
                <Link href="/admin/officials" className="block bg-white shadow rounded p-4 hover:bg-gray-50">
                  <div className="font-semibold">Officials</div>
                  <div className="text-sm text-gray-600">Verify, reject or reassign Local Church Officials.</div>
                </Link>
              </li>
              <li>
                <Link href="/admin/link-requests" className="block bg-white shadow rounded p-4 hover:bg-gray-50">
                  <div className="font-semibold">Link requests</div>
                  <div className="text-sm text-gray-600">Approve members and clergy claiming a record.</div>
                </Link>
              </li>
              <li>
                <Link href="/admin/import" className="block bg-white shadow rounded p-4 hover:bg-gray-50">
                  <div className="font-semibold">Bulk import</div>
                  <div className="text-sm text-gray-600">Upload CSVs to load hierarchy or member data.</div>
                </Link>
              </li>
              <li>
                <Link href="/admin/diocese/1/settings" className="block bg-white shadow rounded p-4 hover:bg-gray-50">
                  <div className="font-semibold">Diocese settings</div>
                  <div className="text-sm text-gray-600">Letterhead, contact info, bishop signature, transfer-letter template, default CC.</div>
                </Link>
              </li>
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
