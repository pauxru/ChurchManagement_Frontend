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
