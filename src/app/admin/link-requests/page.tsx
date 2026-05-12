"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

interface PendingUser {
  userID: string;
  memberName: string;
  memberEmail: string;
  linkedChurchMemberId?: number | null;
  linkedChurchMemberStatus?: number | null;
  linkedClergyId?: number | null;
  linkedClergyStatus?: number | null;
}

export default function LinkRequestsPage() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const [requests, setRequests] = useState<PendingUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    setBusy(true); setError(null);
    try {
      const data = await apiFetch<PendingUser[]>("/Admin/link-requests", token);
      setRequests(data);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (!session?.user) return <div className="p-8">Please sign in.</div>;

  async function decide(userId: string, kind: "church-member" | "clergy", action: "approve" | "reject") {
    try {
      await apiFetch(`/Admin/link-requests/${userId}/${kind}/${action}`, token, { method: "POST" });
      refresh();
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-4">Pending link requests</h1>
      {error && <p className="text-red-700 mb-3">{error}</p>}
      {busy && <p>Loading…</p>}

      {!busy && requests.length === 0 && (
        <p className="text-gray-600">No pending requests in your scope.</p>
      )}

      <ul className="space-y-3">
        {requests.map((r) => (
          <li key={r.userID} className="bg-white shadow rounded p-4">
            <div className="font-semibold">{r.memberName}</div>
            <div className="text-sm text-gray-600">{r.memberEmail}</div>
            <div className="mt-2 text-sm">
              {r.linkedChurchMemberStatus === 1 && (
                <div className="flex items-center gap-2 mb-2">
                  <span>Wants to link to ChurchMember #{r.linkedChurchMemberId}</span>
                  <button onClick={() => decide(r.userID, "church-member", "approve")} className="bg-green-600 text-white px-3 py-1 rounded">Approve</button>
                  <button onClick={() => decide(r.userID, "church-member", "reject")} className="bg-red-600 text-white px-3 py-1 rounded">Reject</button>
                </div>
              )}
              {r.linkedClergyStatus === 1 && (
                <div className="flex items-center gap-2">
                  <span>Wants to link to Clergy #{r.linkedClergyId}</span>
                  <button onClick={() => decide(r.userID, "clergy", "approve")} className="bg-green-600 text-white px-3 py-1 rounded">Approve</button>
                  <button onClick={() => decide(r.userID, "clergy", "reject")} className="bg-red-600 text-white px-3 py-1 rounded">Reject</button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
