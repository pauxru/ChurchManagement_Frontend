"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

interface MemberMatch {
  memberId: number;
  displayName: string;
  localChurchName: string;
  parishName?: string;
  dioceseName?: string;
  archDioceseName?: string;
  matchedByEmail: boolean;
  matchedByPhone: boolean;
}

interface DiscoverResult {
  memberMatches: MemberMatch[];
  clergyMatches: unknown[];
}

type RequestStatus = "idle" | "pending" | "approved" | "rejected" | "error";

export default function LinkPage() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otp, setOtp] = useState("");
  const [otpMemberId, setOtpMemberId] = useState<number | null>(null);
  const [matches, setMatches] = useState<MemberMatch[] | null>(null);
  const [requestState, setRequestState] = useState<Record<number, RequestStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (!session?.user) return <div className="p-8">Please sign in to link your church record.</div>;

  const userEmail = session.user.email ?? "";

  async function discover() {
    setBusy(true); setError(null); setMatches(null);
    try {
      const result = await apiFetch<DiscoverResult>("/Link/church-member/discover", token, {
        method: "POST",
        json: { email: userEmail, phone: phone || undefined },
      });
      setMatches(result.memberMatches);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function requestByEmail(memberId: number) {
    setRequestState((s) => ({ ...s, [memberId]: "pending" }));
    try {
      await apiFetch(`/Link/church-member/${memberId}/request-by-email`, token, { method: "POST" });
    } catch (e: unknown) {
      setRequestState((s) => ({ ...s, [memberId]: "error" }));
      setError((e as Error).message);
    }
  }

  async function startOtp(memberId: number) {
    setOtpMemberId(memberId); setError(null);
    try {
      await apiFetch(`/Link/church-member/${memberId}/request-by-otp`, token, { method: "POST" });
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  async function verifyOtp() {
    if (otpMemberId == null) return;
    try {
      await apiFetch(`/Link/church-member/verify-otp`, token, {
        method: "POST",
        json: { memberId: otpMemberId, otp },
      });
      setRequestState((s) => ({ ...s, [otpMemberId]: "pending" }));
      setOtpMemberId(null); setOtp("");
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  async function redeemCode() {
    setError(null);
    try {
      await apiFetch(`/Link/church-member/redeem-code`, token, {
        method: "POST",
        json: { code },
      });
      setCode("");
      setError("Code redeemed — link approved.");
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Link your church record</h1>
      <p className="text-gray-600 mb-6">
        We&apos;ll try to match an existing member record to your account using your email{userEmail ? ` (${userEmail})` : ""},
        an SMS code to your phone, or a one-time code from your local church admin.
      </p>

      <div className="space-y-6">
        <section className="bg-white shadow rounded p-4">
          <h2 className="font-semibold mb-2">1. Find your record</h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border px-3 py-2 rounded flex-1"
            />
            <button onClick={discover} disabled={busy} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
              Search
            </button>
          </div>

          {matches && matches.length === 0 && (
            <p className="mt-3 text-gray-600">No matches found. Ask your local-church admin for a claim code.</p>
          )}

          {matches && matches.length > 0 && (
            <ul className="mt-4 space-y-3">
              {matches.map((m) => (
                <li key={m.memberId} className="border rounded p-3">
                  <div className="font-semibold">{m.displayName}</div>
                  <div className="text-sm text-gray-600">
                    {m.localChurchName}
                    {m.parishName && ` · ${m.parishName}`}
                    {m.dioceseName && ` · ${m.dioceseName}`}
                    {m.archDioceseName && ` · ${m.archDioceseName}`}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {m.matchedByEmail && (
                      <button
                        onClick={() => requestByEmail(m.memberId)}
                        disabled={requestState[m.memberId] === "pending"}
                        className="bg-green-600 text-white px-3 py-1 rounded disabled:opacity-50"
                      >
                        This is me (email match)
                      </button>
                    )}
                    <button
                      onClick={() => startOtp(m.memberId)}
                      className="bg-yellow-600 text-white px-3 py-1 rounded"
                    >
                      Verify by SMS
                    </button>
                    {requestState[m.memberId] === "pending" && (
                      <span className="self-center text-sm text-gray-700">Awaiting admin approval…</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {otpMemberId != null && (
          <section className="bg-white shadow rounded p-4">
            <h2 className="font-semibold mb-2">2. Enter the SMS code</h2>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                className="border px-3 py-2 rounded flex-1"
              />
              <button onClick={verifyOtp} className="bg-green-600 text-white px-4 py-2 rounded">
                Verify
              </button>
            </div>
          </section>
        )}

        <section className="bg-white shadow rounded p-4">
          <h2 className="font-semibold mb-2">Or: redeem an admin-issued claim code</h2>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="8-character code"
              className="border px-3 py-2 rounded flex-1 font-mono uppercase"
            />
            <button onClick={redeemCode} className="bg-red-700 text-white px-4 py-2 rounded">
              Redeem
            </button>
          </div>
        </section>

        {error && <p className="text-red-700">{error}</p>}
      </div>
    </div>
  );
}
