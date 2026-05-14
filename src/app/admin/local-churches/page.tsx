"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";

interface ChurchRow {
  localChurchId: number;
  localChurchCode: string;
  localChurchName: string;
  parishName: string | null;
  dioceseName: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
}

interface ChurchFull {
  localChurchId: number;
  localChurchCode: string | null;
  localChurchName: string;
  localChurchDescription: string;
  localChurchLocation: string | null;
  localChurchClass: string | null;
  localChurchAddress: string | null;
  localChurchCoordinates: string | null;
  localChurchParishID: number;
  logoUrl: string | null;
  bannerUrl: string | null;
  serviceTimes: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  monthlyCessAmount: number | null;
}

export default function AdminLocalChurchesPage() {
  // Suspense boundary required because the inner component calls
  // useSearchParams() — Next 15 fails the build during prerender otherwise.
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading…</div>}>
      <AdminLocalChurchesInner />
    </Suspense>
  );
}

function AdminLocalChurchesInner() {
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<ChurchRow[] | null>(null);
  const [editing, setEditing] = useState<ChurchFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [focusHandled, setFocusHandled] = useState(false);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";
    fetch(`${base}/public/local-churches`)
      .then(r => (r.ok ? r.json() : []))
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  const openEditor = useCallback(async (id: number) => {
    setError(null);
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";
      const r = await fetch(`${base}/public/local-churches/${id}`);
      if (!r.ok) throw new Error(`Couldn't load LC ${id}`);
      const pub = await r.json();
      // Convert the public DTO into the writable shape the PUT endpoint expects.
      setEditing({
        localChurchId: pub.localChurchId,
        localChurchCode: pub.localChurchCode || null,
        localChurchName: pub.localChurchName,
        localChurchDescription: pub.description ?? "",
        localChurchLocation: pub.location ?? null,
        localChurchClass: null,
        localChurchAddress: pub.address ?? null,
        localChurchCoordinates: null,
        localChurchParishID: 0,
        logoUrl: pub.logoUrl ?? null,
        bannerUrl: pub.bannerUrl ?? null,
        serviceTimes: pub.serviceTimes ?? null,
        contactPhone: pub.contactPhone ?? null,
        contactEmail: pub.contactEmail ?? null,
        websiteUrl: pub.websiteUrl ?? null,
        monthlyCessAmount: pub.monthlyCessAmount ?? null,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // Auto-open the editor modal when arriving here from /lc/[id]'s pen icon
  // (which links to /admin/local-churches?focus=<id>). We drop the param
  // afterwards so back-navigation doesn't re-trigger.
  useEffect(() => {
    if (focusHandled) return;
    const focus = searchParams?.get("focus");
    if (!focus) return;
    const id = Number(focus);
    if (!Number.isFinite(id) || id <= 0) return;
    setFocusHandled(true);
    openEditor(id);
    router.replace("/admin/local-churches");
  }, [searchParams, openEditor, router, focusHandled]);

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/Admin/localchurch/${editing.localChurchId}`, token, {
        method: "PUT",
        json: editing,
      });
      setEditing(null);
      const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:5132";
      const refreshed = await fetch(`${base}/public/local-churches`);
      setRows(refreshed.ok ? await refreshed.json() : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <div className="p-8">Loading…</div>;
  if (!session?.user) return <div className="p-8">Please sign in.</div>;

  return (
    <div className="container mx-auto px-6 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Manage Local Churches</h1>
        <Link href="/admin" className="text-sm text-red-700 hover:underline">← Admin</Link>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded mb-4">{error}</div>}
      {!rows && <p className="text-gray-500">Loading churches…</p>}

      {rows && rows.length > 0 && (
        <table className="w-full border border-gray-200 rounded overflow-hidden">
          <thead className="bg-gray-50 text-sm">
            <tr className="text-left">
              <th className="px-3 py-2">Logo</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Parish</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.localChurchId} className="border-t border-gray-200">
                <td className="px-3 py-2">
                  {r.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.logoUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-3 py-2 font-medium">{r.localChurchName}</td>
                <td className="px-3 py-2 text-xs font-mono text-gray-600">{r.localChurchCode}</td>
                <td className="px-3 py-2 text-sm text-gray-600">{r.parishName ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => openEditor(r.localChurchId)}
                    className="text-sm text-red-700 hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setEditing(null)}>
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl mt-8 p-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">{editing.localChurchName}</h2>

            <div className="space-y-3">
              <Field label="Name" value={editing.localChurchName}
                onChange={v => setEditing({ ...editing, localChurchName: v })} />
              <Field label="Address" value={editing.localChurchAddress ?? ""}
                onChange={v => setEditing({ ...editing, localChurchAddress: v || null })} />
              <Field label="Logo URL"
                placeholder="/lc-photos/<file>.jpg or https://…"
                hint="A square image works best (max 512px). Drop the file in frontend/public/lc-photos/ then paste the path here."
                value={editing.logoUrl ?? ""}
                onChange={v => setEditing({ ...editing, logoUrl: v || null })} />
              <Field label="Banner URL"
                placeholder="/lc-photos/<banner>.jpg or https://…"
                hint="A wide hero image (1600×600 or similar). Used as the page header background."
                value={editing.bannerUrl ?? ""}
                onChange={v => setEditing({ ...editing, bannerUrl: v || null })} />

              <label className="block">
                <span className="text-sm text-gray-600">Service times</span>
                <textarea
                  rows={3}
                  placeholder="e.g. Sundays 9 AM &amp; 11 AM · Wednesday Bible study 6 PM"
                  value={editing.serviceTimes ?? ""}
                  onChange={e => setEditing({ ...editing, serviceTimes: e.target.value || null })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-sm text-gray-600">About / description</span>
                <textarea
                  rows={5}
                  value={editing.localChurchDescription}
                  onChange={e => setEditing({ ...editing, localChurchDescription: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                />
              </label>

              <Field label="Contact phone" value={editing.contactPhone ?? ""}
                onChange={v => setEditing({ ...editing, contactPhone: v || null })} />
              <Field label="Contact email" value={editing.contactEmail ?? ""}
                onChange={v => setEditing({ ...editing, contactEmail: v || null })} />
              <Field label="External website" value={editing.websiteUrl ?? ""}
                placeholder="https://…"
                onChange={v => setEditing({ ...editing, websiteUrl: v || null })} />

              <label className="block">
                <span className="text-sm text-gray-600">Monthly cess obligation (KES)</span>
                <input
                  type="number"
                  step="100"
                  min="0"
                  placeholder="e.g. 15000"
                  value={editing.monthlyCessAmount ?? ""}
                  onChange={e => setEditing({
                    ...editing,
                    monthlyCessAmount: e.target.value === "" ? null : Number(e.target.value),
                  })}
                  className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How much this church remits to the diocese each month. Cess submissions colour-code green/red against this.
                </p>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, hint }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
      />
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </label>
  );
}
