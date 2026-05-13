"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const EXPLAIN: Record<string, { title: string; body: string; action: string }> = {
  AccessDenied: {
    title: "Access denied",
    body: "Microsoft Entra recognised your identity but the AIPCA tenant has not yet authorised your account to use this app. This usually means the tenant's User Flow isn't attached to the app, so first-time sign-ins aren't auto-provisioned.",
    action: "Ask the diocesan admin to add the ChurchManagement-SPA app to the External Identities → User flows → SignUpSignIn → Applications list, or to invite your email as an external user in the tenant.",
  },
  Configuration: {
    title: "Auth misconfiguration",
    body: "The app's Entra settings (client ID, secret, redirect URI, or issuer) don't match the live tenant config. Sign-in stopped before we could even talk to your provider.",
    action: "Ask the admin to verify AUTH_MICROSOFT_ENTRA_ID_ID / SECRET / ISSUER on the AipcaWeb service env, and that the redirect URI https://aipca.co.ke/api/auth/callback/microsoft-entra-id is registered in the SPA app reg.",
  },
  OAuthCallbackError: {
    title: "OAuth callback failed",
    body: "Microsoft Entra redirected you back to AIPCA but the callback didn't carry a valid code or state. This is usually a redirect-URI mismatch, a stale cookie, or a network issue.",
    action: "Try again from a private/incognito window. If it still fails, check that the redirect URI in the SPA app reg exactly matches https://aipca.co.ke/api/auth/callback/microsoft-entra-id (no trailing slash, no www mismatch).",
  },
  Verification: {
    title: "Token verification failed",
    body: "We got an Entra token back but couldn't validate it.",
    action: "Try signing in again. If it persists, the AipcaApi backend's AzureAd:Audience / TenantId config likely drifted from the Entra side.",
  },
  Default: {
    title: "Sign-in failed",
    body: "Something went wrong while signing you in.",
    action: "Try again. If it keeps happening, share the error code below with the diocesan admin.",
  },
};

function ErrorBody() {
  const params = useSearchParams();
  const code = params?.get("error") ?? "Default";
  const detail = EXPLAIN[code] ?? EXPLAIN.Default;

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="bg-red-700 text-white px-6 py-4">
        <h1 className="text-2xl font-bold">{detail.title}</h1>
        <p className="text-sm text-red-100 mt-1 font-mono">Error code: {code}</p>
      </div>
      <div className="px-6 py-5 space-y-4">
        <p className="text-gray-700 leading-relaxed">{detail.body}</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <p className="text-sm text-yellow-900 font-medium">What to do</p>
          <p className="text-sm text-yellow-900 mt-1">{detail.action}</p>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/" className="bg-red-700 text-white px-5 py-2 rounded font-medium hover:bg-red-600">
            Back to home
          </Link>
          <Link href="/login" className="border border-gray-300 px-5 py-2 rounded font-medium text-gray-700 hover:bg-gray-50">
            Try again
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <Suspense fallback={<div className="text-center text-gray-500">Loading…</div>}>
          <ErrorBody />
        </Suspense>
      </div>
    </div>
  );
}
