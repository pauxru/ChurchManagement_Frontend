import { NextResponse } from "next/server";
import { auth, OfficialVerificationStatus } from "@/auth";

// Middleware:
//   1. Require signed-in for any /lc/* or /diocese/* or /admin/* or /signup/*.
//   2. If signed in but the user's official record isn't Verified, force them
//      through /signup/complete (except when they're already there).
//   3. Public routes (/, /login, /api/auth/*) skip the check.
export default auth(async (req) => {
  const { pathname } = req.nextUrl;

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
