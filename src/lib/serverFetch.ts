// Helper for server-component fetches into the .NET backend.
//
// In production the Next.js server runs as `AipcaWeb` on localhost:3001 and
// the .NET backend runs as `AipcaApi` on localhost:5132. Server-side fetches
// should hit the backend directly via localhost — going back out through
// Caddy at the public URL costs an extra hop AND breaks on hosts without
// hairpin NAT (the server can't connect to its own public IP from itself).
//
// In dev `INTERNAL_API_BASE` is usually unset; we fall back to NEXT_PUBLIC_API_BASE
// (which dev uses to point at localhost:5132 anyway), then to a sensible default.

const internal = process.env.INTERNAL_API_BASE
  ?? process.env.NEXT_PUBLIC_API_BASE
  ?? "http://localhost:5132";

export function serverApiUrl(path: string): string {
  if (!path.startsWith("/")) path = "/" + path;
  return `${internal}${path}`;
}
