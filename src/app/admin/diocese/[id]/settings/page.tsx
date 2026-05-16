"use client";

// Admin page for diocese letterhead + transfer-letter settings. Drives
// the printable PDF the Bishop's office emits when transfers are
// confirmed: contact block on the letterhead, the bishop's signature
// image, the body template with `{{Placeholders}}`, and the default CC
// list. See Phase 4 of the transfers-board spec.

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { useCanManageChurches } from "@/lib/permissions";

interface DioceseSettings {
  dioceseId: number;
  dioceseName: string;
  address: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  bishopSignatureDataUri: string | null;
  letterTemplate: string | null;
  defaultLetterCc: string | null;
}

// The letter renderer (TransferLetterService) substitutes these tokens
// in order. Kept inline so the click-to-copy panel can list them — when
// a placeholder is added on the backend, mirror it here.
const PLACEHOLDERS: { token: string; description: string }[] = [
  { token: "{{ClergyName}}",     description: "Full display name with salutation" },
  { token: "{{FromAssignment}}", description: "e.g. \"Gachika Parish\"" },
  { token: "{{ToAssignment}}",   description: "e.g. \"Nembu Parish\"" },
  { token: "{{EffectiveDate}}",  description: "Formatted, e.g. \"1 June 2026\"" },
  { token: "{{BishopName}}",     description: "In-charge Bishop of the diocese" },
  { token: "{{BishopTitle}}",    description: "e.g. \"Bishop, Gatundu Diocese\"" },
  { token: "{{DioceseName}}",    description: "e.g. \"Gatundu Diocese\"" },
  { token: "{{IssueDate}}",      description: "Today's date when the PDF renders" },
  { token: "{{CcList}}",         description: "Formatted CC block (cc: + indented names)" },
];

const DEFAULT_TEMPLATE = `{{IssueDate}}

{{ClergyName}}
{{FromAssignment}}

Dear {{ClergyName}},

By the authority vested in me as Bishop of {{DioceseName}}, you are
hereby transferred from {{FromAssignment}} to {{ToAssignment}},
effective {{EffectiveDate}}. You are to assume your new duties on
that date.

May God bless your ministry.

Yours in Christ,

{{BishopName}}
{{BishopTitle}}

{{CcList}}`;

export default function AdminDioceseSettingsPage() {
  const params = useParams<{ id: string }>();
  const dioceseId = Number(params?.id);
  const { data: session, status } = useSession();
  const token = session?.accessToken;
  const canManage = useCanManageChurches();

  const [settings, setSettings] = useState<DioceseSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<DioceseSettings>(`/Admin/diocese/${dioceseId}/settings`, token);
      setSettings(data);
      setSignaturePreview(data.bishopSignatureDataUri);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [token, dioceseId]);

  useEffect(() => {
    if (status === "loading") return;
    if (!canManage) { setLoading(false); return; }
    reload();
  }, [status, canManage, reload]);

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setSignaturePreview(result);
        setSettings((s) => s ? { ...s, bishopSignatureDataUri: result } : s);
      }
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!settings || !token) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<DioceseSettings>(
        `/Admin/diocese/${dioceseId}/settings`, token, {
          method: "PUT",
          json: {
            address: settings.address,
            contactPhone: settings.contactPhone,
            contactEmail: settings.contactEmail,
            websiteUrl: settings.websiteUrl,
            bishopSignatureDataUri: settings.bishopSignatureDataUri,
            letterTemplate: settings.letterTemplate,
            defaultLetterCc: settings.defaultLetterCc,
          },
        });
      setSettings(updated);
      setSignaturePreview(updated.bishopSignatureDataUri);
      setSavedAt(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const copyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(token);
      window.setTimeout(() => setCopiedToken((cur) => cur === token ? null : cur), 1500);
    } catch {
      // Clipboard API may be unavailable in the IIS deployment context;
      // fall back to a visible "copy failed" hint by leaving copiedToken
      // unset so the chip doesn't briefly show "copied".
    }
  };

  if (status === "loading" || loading) {
    return <div className="container mx-auto px-6 py-6 text-gray-500">Loading…</div>;
  }
  if (!canManage) {
    return (
      <div className="container mx-auto px-6 py-10 max-w-xl text-center">
        <h1 className="text-xl font-semibold text-gray-800">You don&apos;t have access to this page</h1>
        <p className="text-sm text-gray-600 mt-2">
          Diocese settings can only be edited by a Bishop (or above) of this diocese.
        </p>
      </div>
    );
  }
  if (error && !settings) {
    return (
      <div className="container mx-auto px-6 py-6 max-w-xl">
        <div className="bg-red-50 border border-red-300 text-red-800 rounded p-3 text-sm">{error}</div>
      </div>
    );
  }
  if (!settings) return null;

  return (
    <div className="container mx-auto px-6 py-6 max-w-4xl space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <Link href={`/diocese/${dioceseId}`} className="text-sm text-blue-700 hover:underline">
            &larr; Back to diocese overview
          </Link>
          <h1 className="text-2xl font-bold mt-1">{settings.dioceseName} — Settings</h1>
          <p className="text-sm text-gray-600">
            Letterhead, bishop signature, and the transfer-letter template.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && (
            <span className="text-xs text-emerald-700">
              Saved {savedAt.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 rounded p-3 text-sm">
          {error}
          <button className="ml-3 underline" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      <section className="bg-white border rounded-md p-4 space-y-3">
        <h2 className="font-semibold">Contact</h2>
        <label className="flex flex-col text-sm">
          <span className="text-gray-600">Address</span>
          <textarea
            value={settings.address ?? ""}
            onChange={(e) => setSettings({ ...settings, address: e.target.value || null })}
            rows={3}
            className="border rounded px-2 py-1"
            placeholder={"P.O. Box 123-00100\nNairobi, Kenya"}
          />
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <label className="flex flex-col">
            <span className="text-gray-600">Contact phone</span>
            <input
              type="tel"
              value={settings.contactPhone ?? ""}
              onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value || null })}
              className="border rounded px-2 py-1"
              placeholder="+254 7XX XXX XXX"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-gray-600">Contact email</span>
            <input
              type="email"
              value={settings.contactEmail ?? ""}
              onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value || null })}
              className="border rounded px-2 py-1"
              placeholder="diocese@example.org"
            />
          </label>
          <label className="flex flex-col">
            <span className="text-gray-600">Website</span>
            <input
              type="url"
              value={settings.websiteUrl ?? ""}
              onChange={(e) => setSettings({ ...settings, websiteUrl: e.target.value || null })}
              className="border rounded px-2 py-1"
              placeholder="https://diocese.example.org"
            />
          </label>
        </div>
      </section>

      <section className="bg-white border rounded-md p-4">
        <h2 className="font-semibold mb-3">Bishop signature</h2>
        <p className="text-xs text-gray-600 mb-2">
          Upload a PNG of the Bishop&apos;s signature on a white or transparent background
          (recommended size: 400×120px).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
              }}
              className="text-sm"
            />
            {signaturePreview && (
              <button
                type="button"
                onClick={() => {
                  setSignaturePreview(null);
                  setSettings({ ...settings, bishopSignatureDataUri: null });
                }}
                className="mt-2 text-xs text-red-700 hover:underline block"
              >
                Remove signature
              </button>
            )}
          </div>
          <div className="border rounded p-2 bg-gray-50 min-h-[120px] flex items-center justify-center">
            {signaturePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signaturePreview} alt="Bishop signature preview" className="max-h-32 object-contain" />
            ) : (
              <span className="text-xs text-gray-400">No signature uploaded.</span>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white border rounded-md p-4">
        <h2 className="font-semibold mb-3">Letter template</h2>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(0,16rem)] gap-4">
          <div>
            <textarea
              value={settings.letterTemplate ?? ""}
              onChange={(e) => setSettings({ ...settings, letterTemplate: e.target.value || null })}
              rows={16}
              className="border rounded px-2 py-1 w-full font-mono text-xs"
              placeholder={DEFAULT_TEMPLATE}
            />
            <div className="text-[11px] text-gray-500 mt-1">
              Leave blank to use the seeded default template.{" "}
              <button
                type="button"
                onClick={() => setSettings({ ...settings, letterTemplate: DEFAULT_TEMPLATE })}
                className="text-blue-700 hover:underline"
              >
                Insert default
              </button>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-700 mb-1">Available placeholders</h3>
            <ul className="space-y-1">
              {PLACEHOLDERS.map((p) => (
                <li key={p.token} className="text-xs">
                  <button
                    type="button"
                    onClick={() => copyToken(p.token)}
                    className="font-mono bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5 rounded"
                    title={p.description}
                  >
                    {p.token}
                  </button>
                  {copiedToken === p.token && (
                    <span className="ml-1 text-[10px] text-emerald-700">copied</span>
                  )}
                  <span className="block text-[11px] text-gray-500 ml-1">{p.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white border rounded-md p-4">
        <h2 className="font-semibold mb-3">Default CC list</h2>
        <p className="text-xs text-gray-600 mb-2">
          One CC recipient per line: e.g. <span className="font-mono">Most Rev Samson Muthuri</span>.
          Pre-fills the Confirm dialog on the transfers board.
        </p>
        <textarea
          value={settings.defaultLetterCc ?? ""}
          onChange={(e) => setSettings({ ...settings, defaultLetterCc: e.target.value || null })}
          rows={4}
          className="border rounded px-2 py-1 w-full font-mono text-xs"
          placeholder={"Most Rev Samson Muthuri\nVen Joseph Gatundu"}
        />
      </section>
    </div>
  );
}
