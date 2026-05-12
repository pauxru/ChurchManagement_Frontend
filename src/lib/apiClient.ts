"use client";

// Lightweight API helper used by App Router client components.
// Reads the token from useSession() and attaches Authorization: Bearer.
// On 401 it triggers a sign-in redirect so users don't see opaque errors.

import { signIn } from "next-auth/react";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";

export async function apiFetch<T = unknown>(
  path: string,
  token: string | undefined,
  init?: RequestInit & { json?: unknown }
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.json !== undefined) headers.set("Content-Type", "application/json");

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });

  if (res.status === 401) {
    // Session expired or token isn't accepted — bounce to sign-in.
    await signIn("microsoft-entra-id");
    throw new Error("Authentication required");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}

export async function apiUpload<T = unknown>(
  path: string,
  token: string | undefined,
  formData: FormData
): Promise<T> {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}
