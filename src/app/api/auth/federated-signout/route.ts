import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/auth";

// Federated sign-out. Clears the local NextAuth session, then redirects
// through Entra's end-session endpoint so the user's CIAM SSO cookie is
// also dropped — without this, "Sign in" silently re-establishes the same
// session. Triggered from the UserMenu's Sign out button.
//
// Derivation: the Entra issuer URL ends in /v2.0; the corresponding
// end-session endpoint is /oauth2/v2.0/logout under the same authority.
//   issuer  : https://<tenant>.ciamlogin.com/<tid>/v2.0
//   logout  : https://<tenant>.ciamlogin.com/<tid>/oauth2/v2.0/logout
//
// If AUTH_MICROSOFT_ENTRA_ID_ISSUER isn't set we fall back to local sign-out
// only (dev / preview environments).
export async function GET(req: NextRequest): Promise<NextResponse> {
  await signOut({ redirect: false });

  const origin = new URL(req.url).origin;
  const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ?? "";

  if (!issuer) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const logoutUrl = issuer.replace(/\/v2\.0\/?$/, "/oauth2/v2.0/logout");
  const url = new URL(logoutUrl);
  url.searchParams.set("post_logout_redirect_uri", `${origin}/login`);
  return NextResponse.redirect(url);
}
