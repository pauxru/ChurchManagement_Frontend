import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { signOut } from "@/auth";

// Federated sign-out. Three goals, in order:
//   1. Tell Entra exactly WHICH session to terminate (id_token_hint).
//      Without this Entra may show a "select account to sign out" prompt
//      and won't reliably revoke the specific refresh tokens.
//   2. Drop NextAuth's local session cookie (signOut).
//   3. Send the browser through Entra's /oauth2/v2.0/logout so the CIAM
//      SSO cookie also dies — otherwise re-clicking Sign in silently
//      re-attaches the same session without a credential prompt.
//
// Issuer → logout URL derivation:
//   issuer  : https://<tenant>.ciamlogin.com/<tid>/v2.0
//   logout  : https://<tenant>.ciamlogin.com/<tid>/oauth2/v2.0/logout
//
// id_token is read BEFORE signOut() — signOut clears the cookie, so reading
// it afterwards would always return null.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });
  const idTokenHint = (token as { idToken?: string } | null)?.idToken;

  await signOut({ redirect: false });

  const origin = new URL(req.url).origin;
  const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ?? "";

  if (!issuer) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const logoutUrl = issuer.replace(/\/v2\.0\/?$/, "/oauth2/v2.0/logout");
  const url = new URL(logoutUrl);
  url.searchParams.set("post_logout_redirect_uri", `${origin}/login`);
  if (idTokenHint) {
    url.searchParams.set("id_token_hint", idTokenHint);
  }
  return NextResponse.redirect(url);
}
