import { NextResponse } from "next/server";
import { auth, OfficialVerificationStatus } from "@/auth";

// Middleware:
//   1. Auto-redirect verified LC officials from "/" to their LC workspace
//      (one-shot on initial landing after sign-in; navbar still links back to "/").
//   2. Require signed-in for any /lc/* or /diocese/* or /admin/* or /signup/*.
//   3. If signed in but the user's official record isn't Verified, force them
//      through /signup/complete (except when they're already there).
//   4. Public routes (/, /login, /api/auth/*) skip the check otherwise.
export default auth(async (req) => {
  const { pathname } = req.nextUrl;

  // Auto-redirect a verified LC official from the bare root to their LC
  // workspace. Admins are exempt — they stay on "/" to see the diocese
  // overview. Officials browsing public pages (#about anchors, /churches
  // when those exist) hit those routes directly, not "/", so they aren't
  // bounced; this is intentionally scoped to "/" only.
  if (pathname === "/" && req.auth) {
    const roles = req.auth.user?.roles ?? [];
    const isAdmin = roles.includes("Admin");
    if (!isAdmin) {
      const officials = req.auth.profile?.officials ?? [];
      const verified = officials.find(
        o => o.status === OfficialVerificationStatus.Verified && o.localChurchId,
      );
      if (verified?.localChurchId) {
        return NextResponse.redirect(new URL(`/lc/${verified.localChurchId}`, req.url));
      }
    }
  }

  // Public allow-list.
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/signup/complete" ||
    pathname.startsWith("/signup/complete/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images")
  ) {
    return NextResponse.next();
  }

  // Gated routes.
  const gated =
    pathname.startsWith("/lc/") ||
    pathname.startsWith("/diocese/") ||
    pathname.startsWith("/admin");

  if (!gated) return NextResponse.next();

  if (!req.auth) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  // Admin role bypass — Bishops and admins can hit any gated route regardless
  // of personal verification status. Their access is enforced by the backend.
  const roles = req.auth.user?.roles ?? [];
  if (roles.includes("Admin")) return NextResponse.next();

  // /admin routes for ordinary users: backend will 403 if they have no
  // AdminAssignment. Don't redirect them through signup.
  if (pathname.startsWith("/admin")) return NextResponse.next();

  // /lc/* and /diocese/* require a Verified LocalChurchOfficial. The profile
  // is cached on the session JWT (refreshed every 5 min in auth.ts).
  const officials = req.auth.profile?.officials ?? [];
  const isVerified = officials.some(o => o.status === OfficialVerificationStatus.Verified);
  if (!isVerified) {
    return NextResponse.redirect(new URL("/signup/complete", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|images|.*\\.svg).*)",
  ],
};
