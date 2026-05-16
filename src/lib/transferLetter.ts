// Tiny helper for the per-transfer PDF endpoint. Centralised so the
// notifications page, board confirm dialog, and any future "open letter"
// affordance all hit the same URL shape. Kept separate from apiClient.ts
// because the PDF is served as a binary stream — callers just open it in
// a new tab rather than parsing JSON.

const baseUrl = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";

// Absolute URL the browser can open in a new tab. The endpoint is JWT
// gated (clergy themselves OR a Bishop/Admin who can see the diocese),
// so callers should only render this for notifications/transfers the
// signed-in user is allowed to view — the backend will 403 otherwise.
export function letterUrlFor(transferId: number): string {
  return `${baseUrl}/Bishop/transfers/${transferId}/letter.pdf`;
}

// Inspect a notification's LinkUrl and decide whether it points at a
// letter we can offer a "Download letter" button for. The Phase-3 backend
// emits LinkUrl as `/notifications#transfer-{id}`; we treat that anchor
// as the transfer id. Older notifications without the anchor return null
// so the UI falls back gracefully (no button) instead of erroring.
export function transferIdFromLink(linkUrl: string | null | undefined): number | null {
  if (!linkUrl) return null;
  const m = /#transfer-(\d+)/.exec(linkUrl);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}
