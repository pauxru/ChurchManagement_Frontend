import NextAuth, { type DefaultSession } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

// Profile shape returned by GET /Profile/me. Kept inline (not imported from a
// shared types file) because auth.ts runs in the NextAuth edge / node runtime
// and we don't want to drag in client-only types.
interface OfficialScope {
  localChurchOfficialId: number;
  localChurchId: number | null;
  localChurchName: string | null;
  localChurchCode: string | null;
  position: number | null;
  positionDetail: string | null;
  status: number;
  rejectionReason: number | null;
}
interface Profile {
  userId: string;
  displayName: string;
  email: string;
  phoneMasked: string | null;
  preferredLanguage: number;
  profilePictureBlobName: string | null;
  officials: OfficialScope[];
}

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
    profile?: Profile;
    user: {
      oid?: string;
      roles?: string[];
    } & DefaultSession["user"];
  }
}

const apiScope = process.env.API_SCOPE ?? "";
const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";

interface EntraJwt {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  oid?: string;
  roles?: string[];
  error?: string;
  profile?: Profile;
  profileFetchedAt?: number;
  [key: string]: unknown;
}

async function refreshAccessToken(token: EntraJwt): Promise<EntraJwt> {
  try {
    const response = await fetch(`${process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
        client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken!,
        scope: `openid profile email offline_access ${apiScope}`,
      }),
    });

    const refreshed = await response.json();
    if (!response.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000 + refreshed.expires_in),
      error: undefined,
    };
  } catch (error) {
    console.error("Failed to refresh Entra token", error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

// Fetch /Profile/me from the backend and cache on the JWT. Runs once on
// sign-in and then every 5 minutes (so position/LC updates show up without
// requiring a full sign-out/sign-in).
async function fetchProfile(accessToken: string): Promise<Profile | undefined> {
  try {
    const res = await fetch(`${apiBase}/Profile/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return undefined;
    return (await res.json()) as Profile;
  } catch (e) {
    console.error("fetchProfile failed", e);
    return undefined;
  }
}

const PROFILE_REFRESH_MS = 5 * 60 * 1000;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      authorization: {
        params: { scope: `openid profile email offline_access ${apiScope}` },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      const t = token as EntraJwt;

      // Initial sign-in: stash Entra tokens, OID, and seed the profile cache.
      if (account && profile) {
        t.accessToken = account.access_token as string | undefined;
        t.refreshToken = account.refresh_token as string | undefined;
        t.expiresAt = account.expires_at as number | undefined;
        t.oid = (profile as { oid?: string }).oid;
        t.roles = ((profile as { roles?: string[] }).roles) ?? [];
        if (t.accessToken) {
          t.profile = await fetchProfile(t.accessToken);
          t.profileFetchedAt = Date.now();
        }
        return t;
      }

      // Refresh access token if near expiry.
      let working = t;
      if (typeof t.expiresAt === "number" && Date.now() / 1000 >= t.expiresAt - 60 && t.refreshToken) {
        working = await refreshAccessToken(t);
      }

      // Refresh profile every 5 minutes (lets position/LC changes propagate).
      if (working.accessToken
          && (!working.profileFetchedAt || Date.now() - working.profileFetchedAt > PROFILE_REFRESH_MS)) {
        working.profile = await fetchProfile(working.accessToken);
        working.profileFetchedAt = Date.now();
      }

      return working;
    },
    async session({ session, token }) {
      const t = token as EntraJwt;
      session.accessToken = t.accessToken;
      session.error = t.error;
      session.profile = t.profile;
      session.user.oid = t.oid;
      session.user.roles = t.roles;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

// Re-export the enum values as constants so client components can compare
// without importing them as a TypeScript enum (the auth.ts file isn't a
// good shared types location, but for now this avoids drift).
export const OfficialVerificationStatus = {
  AwaitingProfile: 1,
  AwaitingLcSelection: 2,
  AwaitingOtp: 3,
  Verified: 4,
  Rejected: 5,
  Disabled: 6,
} as const;
