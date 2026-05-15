import { NextResponse } from "next/server";
import { auth, OfficialVerificationStatus } from "@/auth";

// Routes a signed-in but unverified user MAY still reach.
//   - the verification flow itself
//   - sign-out / auth endpoints
//   - auth-error display
//   - static assets
// Everything else funnels them back to /signup/complete.
const UNVERIFIED_ALLOWED_PREFIXES = [
  "/signup/complete",
  "/api/auth",
  "/auth-error",
  "/forbidden",
  "/_next",
  "/favicon",
  "/aipca-logo",
  "/bishops",
  "/og-image",
  "/images",
];

// Routes anonymous users may reach without signing in.
const ANON_ALLOWED_PREFIXES = [
  "/login",
  "/api/auth",
  "/auth-error",
  "/forbidden",
  "/near-me",
  "/churches",
  "/clergy",
  "/events",
  "/announcements",
  "/_next",
  "/favicon",
  "/aipca-logo",
  "/bishops",
  "/og-image",
  "/images",
];

function startsWithAny(path: string, prefixes: string[]): boolean {
  return prefixes.some(p => path === p || path.startsWith(p + "/") || path.startsWith(p));
}

// Mirrors AppPolicy:RequireVerification on the backend. When false, the
// middleware lets any signed-in user reach any route — no /signup/complete
// gate. Backend handlers honour the same flag so 403s also disappear.
//
// TEMPORARY: defaulted to FALSE while the diocesan workflow beds in. This
// pairs with the backend opening in BishopController + BishopTransfersController
// so signed-in test users can reach every page (Transfers, Diocese overview,
// LC sub-tabs) without needing the LC-official verification flow first.
//
// To restore the production behaviour: change the default below back to
// `!== "false"` (or explicitly set NEXT_PUBLIC_REQUIRE_VERIFICATION=true
// in .env.production / .env.deploy → REQUIRE_VERIFICATION=true).
const REQUIRE_VERIFICATION = process.env.NEXT_PUBLIC_REQUIRE_VERIFICATION === "true";

export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // Anonymous: public landing + the four Stream C browse pages are open;
  // everything else routes to /login.
  if (!req.auth) {
    if (pathname === "/" || startsWithAny(pathname, ANON_ALLOWED_PREFIXES)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Verification globally disabled — every signed-in user roams freely.
  if (!REQUIRE_VERIFICATION) {
    return NextResponse.next();
  }

  const roles = req.auth.user?.roles ?? [];
  const isAdmin = roles.includes("Admin");
  const officials = req.auth.profile?.officials ?? [];
  const isVerified = officials.some(o => o.status === OfficialVerificationStatus.Verified);

  // Auto-redirect a verified LC official from the bare root to their LC
  // workspace. Admins stay on "/" to see the landing page + diocese overview.
  if (pathname === "/" && !isAdmin) {
    const verified = officials.find(
      o => o.status === OfficialVerificationStatus.Verified && o.localChurchId,
    );
    if (verified?.localChurchId) {
      return NextResponse.redirect(new URL(`/lc/${verified.localChurchId}`, req.url));
    }
  }

  // Signed in but NOT verified and NOT admin: lock the session to the
  // verification flow + a small allowlist. Any other route bounces back
  // to /signup/complete so the user can only finish verification.
  if (!isAdmin && !isVerified) {
    if (startsWithAny(pathname, UNVERIFIED_ALLOWED_PREFIXES)) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/signup/complete", req.url));
  }

  // Verified user or admin: free roam through gated routes. The backend
  // still enforces per-resource scope (403 → /forbidden via apiClient).
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|images|.*\\.svg).*)",
  ],
};
