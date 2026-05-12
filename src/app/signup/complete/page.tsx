"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";
import { LocalChurchPicker, LcLookup } from "@/components/LocalChurchPicker";

// Position enum mirrors backend Models.Position.
const POSITION_OPTIONS = [
  { value: 1, label: "Pastor" },
  { value: 2, label: "Treasurer" },
  { value: 3, label: "Chairperson" },
  { value: 4, label: "Secretary" },
  { value: 5, label: "Vice Chair" },
  { value: 6, label: "Member" },
  { value: 7, label: "Other" },
];

const STATUS = {
  AwaitingProfile: 1,
  AwaitingLcSelection: 2,
  AwaitingOtp: 3,
  Verified: 4,
  Rejected: 5,
  Disabled: 6,
};

const REJECTION_MESSAGES: Record<number, string> = {
  1: "The phone number on your church record doesn't match the one we have on file.",
  2: "The National ID you entered doesn't match our records.",
  3: "The name in your church record doesn't match the name on your account.",
  4: "You're registered as a member of a different local church.",
  5: "Your admin needs to add your National ID to your member record. Please contact them.",
  6: "Someone else has already claimed this member record. Please contact your Bishop.",
  7: "We couldn't find your member record at this local church. Please contact your admin.",
  8: "Too many incorrect codes. Please contact your admin to retry.",
  9: "Required claims are missing from your account. Please complete your Microsoft profile.",
  10: "Unknown local church.",
};

interface InitResult {
  status: number;
  phoneMasked: string;
  nextStep: string;
  rejectionReason: number | null;
}
interface ProfileResult {
  status: number;
  position: number;
  nextStep: string;
}
interface SelectLcResult {
  status: number;
  matchedMember: { displayName: string; localChurchName: string; localChurchCode: string } | null;
  phoneMasked: string;
  nextStep: string;
  rejectionReason: number | null;
}
interface OtpConfirmResult {
  verified: boolean;
  reason: number | null;
  attemptsRemaining: number | null;
  localChurchOfficialId: number | null;
  localChurchId: number | null;
}

type Step = "loading" | "profile" | "lc" | "otp" | "rejected" | "success";

export default function SignupCompletePage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const token = session?.accessToken;

  const [step, setStep] = useState<Step>("loading");
  const [phoneMasked, setPhoneMasked] = useState("");
  const [matchedLcName, setMatchedLcName] = useState("");
  const [rejectionReason, setRejectionReason] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile form state.
  const [position, setPosition] = useState<number>(2);
  const [positionDetail, setPositionDetail] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState(1);
  const [displayName, setDisplayName] = useState("");

  // OTP state.
  const [otp, setOtp] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [verifiedLcId, setVerifiedLcId] = useState<number | null>(null);

  // Selected LC.
  const [selectedLc, setSelectedLc] = useState<LcLookup | null>(null);

  const handleInit = useCallback(async () => {
    if (!token) return;
    try {
      const r = await apiFetch<InitResult>("/Signup/init", token, { method: "POST" });
      setPhoneMasked(r.phoneMasked);
      applyStatus(r.status, r.rejectionReason);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token]);

  function applyStatus(status: number, reason: number | null) {
    setRejectionReason(reason);
    if (status === STATUS.AwaitingProfile) setStep("profile");
    else if (status === STATUS.AwaitingLcSelection) setStep("lc");
    else if (status === STATUS.AwaitingOtp) setStep("otp");
    else if (status === STATUS.Verified) setStep("success");
    else setStep("rejected");
  }

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user) {
      router.replace("/login");
      return;
    }
    handleInit();
  }, [sessionStatus, session, handleInit, router]);

  const positionLabel = useMemo(
    () => POSITION_OPTIONS.find((p) => p.value === position)?.label ?? "",
    [position]
  );

  async function submitProfile() {
    if (!token) return;
    if (!nationalId.trim()) { setError("National ID is required."); return; }
    if (position === 7 && !positionDetail.trim()) { setError("Please describe your position."); return; }
    setError(null);
    try {
      const r = await apiFetch<ProfileResult>("/Signup/profile", token, {
        method: "POST",
        json: { position, positionDetail: positionDetail || undefined, nationalId, preferredLanguage, displayName: displayName || undefined },
      });
      applyStatus(r.status, null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submitLc() {
    if (!token || !selectedLc) return;
    setError(null);
    try {
      const r = await apiFetch<SelectLcResult>("/Signup/select-lc", token, {
        method: "POST",
        json: { localChurchId: selectedLc.id },
      });
      setPhoneMasked(r.phoneMasked);
      if (r.matchedMember) setMatchedLcName(r.matchedMember.localChurchName);
      applyStatus(r.status, r.rejectionReason);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function resendOtp() {
    if (!token) return;
    setError(null);
    try {
      await apiFetch("/Signup/otp/request", token, { method: "POST" });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function confirmOtp() {
    if (!token) return;
    setError(null);
    try {
      const r = await apiFetch<OtpConfirmResult>("/Signup/otp/confirm", token, {
        method: "POST",
        json: { otp },
      });
      if (r.verified) {
        setVerifiedLcId(r.localChurchId);
        setStep("success");
      } else if (r.reason !== null) {
        setRejectionReason(r.reason);
        setStep("rejected");
      } else {
        setAttemptsRemaining(r.attemptsRemaining ?? 0);
        setError(`Incorrect code. ${r.attemptsRemaining ?? 0} attempts remaining.`);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (sessionStatus === "loading" || step === "loading") {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto max-w-2xl bg-white shadow rounded p-6">
        <h1 className="text-2xl font-bold mb-1">Complete your account</h1>
        <p className="text-gray-600 mb-6">
          A few details so we can link you to your church record.
        </p>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">{error}</div>}

        {step === "profile" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Position</label>
              <select
                value={position}
                onChange={(e) => setPosition(Number(e.target.value))}
                className="w-full border px-3 py-2 rounded"
              >
                {POSITION_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            {position === 7 && (
              <div>
                <label className="block text-sm font-medium mb-1">Position detail</label>
                <input
                  type="text"
                  value={positionDetail}
                  onChange={(e) => setPositionDetail(e.target.value)}
                  className="w-full border px-3 py-2 rounded"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">National ID number</label>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                className="w-full border px-3 py-2 rounded"
              />
              <p className="text-xs text-gray-500 mt-1">
                We use this only to confirm your identity. It&apos;s stored as a hash, never as plain text.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preferred language</label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(Number(e.target.value))}
                className="w-full border px-3 py-2 rounded"
              >
                <option value={1}>English</option>
                <option value={2}>Swahili</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Display name (optional)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={session?.user?.name ?? ""}
                className="w-full border px-3 py-2 rounded"
              />
            </div>
            <button onClick={submitProfile} className="w-full bg-blue-700 text-white py-2 rounded">
              Continue
            </button>
          </div>
        )}

        {step === "lc" && (
          <div className="space-y-4">
            <h2 className="font-semibold">Pick your local church</h2>
            <p className="text-sm text-gray-600">
              Position: <strong>{positionLabel}</strong>
            </p>
            <LocalChurchPicker onPick={setSelectedLc} />
            {selectedLc && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <div className="text-sm">Selected:</div>
                <div className="font-medium">{selectedLc.name}{selectedLc.code ? ` (${selectedLc.code})` : ""}</div>
                <button onClick={submitLc} className="mt-2 bg-blue-700 text-white px-4 py-2 rounded">
                  Use this church
                </button>
              </div>
            )}
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-4">
            <h2 className="font-semibold">Verify your phone</h2>
            <p className="text-sm text-gray-600">
              We&apos;ve sent a 6-digit code to {phoneMasked}{matchedLcName ? ` for ${matchedLcName}` : ""}.
            </p>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="w-full border px-3 py-2 rounded text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={confirmOtp}
                disabled={otp.length !== 6}
                className="flex-1 bg-blue-700 text-white py-2 rounded disabled:opacity-50"
              >
                Verify
              </button>
              <button onClick={resendOtp} className="px-4 py-2 border rounded">
                Resend
              </button>
            </div>
            {attemptsRemaining !== null && (
              <p className="text-sm text-gray-500">{attemptsRemaining} attempts remaining.</p>
            )}
          </div>
        )}

        {step === "rejected" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-red-700">Verification didn&apos;t succeed</h2>
            <p>{rejectionReason ? REJECTION_MESSAGES[rejectionReason] : "Unknown error."}</p>
            <a href="mailto:info@aipca.example" className="block text-blue-700 underline">
              Contact your admin
            </a>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-green-700">You&apos;re verified!</h2>
            <p>You can now access your local church profile and submit cess, plans, and minutes.</p>
            <button
              onClick={() => router.push(verifiedLcId ? `/lc/${verifiedLcId}` : "/")}
              className="w-full bg-blue-700 text-white py-2 rounded"
            >
              Go to my local church
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
