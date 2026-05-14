"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

// Full ChurchMember shape. ISO date strings; backend parses them on the way in.
interface Member {
  memberID: number;
  memberName: string;
  alias: string | null;
  memberLocalChurchID: number;
  isActive: boolean | null;
  memberSex: string;
  memberAge: number | null;
  memberSince: string;
  memberEmail: string | null;
  memberPhoneNum: string | null;
  memberRole: string | null;
  baptismDay: string | null;
  baptisedBy: string | null;
  baptismChurch: string | null;
  baptismRepresentative: string | null;
  confirmationDay: string | null;
  confirmedBy: string | null;
  confirmationChurch: string | null;
  confirmationWitness: string | null;
  consecrationDay: string | null;
  consecratedBy: string | null;
  consecrationChurch: string | null;
  consecrationRepresentative: string | null;
}

function dateValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function MemberProfilePage() {
  const params = useParams<{ id: string; memberId: string }>();
  const router = useRouter();
  const lcId = Number(params?.id);
  const memberId = Number(params?.memberId);
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [m, setM] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setM(await apiFetch<Member>(`/Lc/${lcId}/Members/${memberId}`, token));
    } catch (e) { setError((e as Error).message); }
  }, [lcId, memberId, token]);
  useEffect(() => { load(); }, [load]);

  function bind<K extends keyof Member>(key: K) {
    return {
      value: (m?.[key] ?? "") as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setM(prev => prev ? ({ ...prev, [key]: e.target.value } as Member) : prev),
    };
  }

  function bindDate<K extends keyof Member>(key: K) {
    return {
      value: dateValue((m?.[key] ?? null) as string | null),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setM(prev => prev ? ({ ...prev, [key]: e.target.value ? new Date(e.target.value).toISOString() : null } as Member) : prev),
    };
  }

  async function save() {
    if (!token || !m) return;
    setSaving(true); setError(null);
    try {
      await apiFetch(`/Admin/member/${memberId}`, token, { method: "PUT", json: m });
      setSavedAt(new Date());
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function softDelete() {
    if (!token || !m) return;
    if (!confirm(`Deactivate ${m.memberName}?`)) return;
    try {
      await apiFetch(`/Lc/${lcId}/Members/${memberId}`, token, { method: "DELETE" });
      router.push(`/lc/${lcId}/members`);
    } catch (e) { setError((e as Error).message); }
  }

  if (!m) return <div className="container mx-auto px-6 py-6">{error ?? "Loading..."}</div>;

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href={`/lc/${lcId}/members`} className="text-sm text-red-700 hover:underline">← All members</Link>
          <h2 className="text-2xl font-semibold mt-1">{m.memberName || "New member"}</h2>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && <span className="text-xs text-gray-500">Saved {savedAt.toLocaleTimeString()}</span>}
          <button onClick={save} disabled={saving} className="bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
          {m.isActive !== false && (
            <button onClick={softDelete} className="bg-white border border-red-700 text-red-700 px-4 py-2 rounded">
              Deactivate
            </button>
          )}
        </div>
      </div>

      {error && <div className="text-red-700">{error}</div>}

      <Section title="Identity">
        <Field label="Full name"><input className="w-full border px-3 py-2 rounded" {...bind("memberName")} /></Field>
        <Field label="Alias"><input className="w-full border px-3 py-2 rounded" {...bind("alias")} /></Field>
        <Field label="Sex">
          <select className="w-full border px-3 py-2 rounded" {...bind("memberSex")}>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </Field>
        <Field label="Age">
          <input
            type="number"
            className="w-full border px-3 py-2 rounded"
            value={m.memberAge ?? ""}
            onChange={(e) => setM({ ...m, memberAge: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </Field>
        <Field label="Member since"><input type="date" className="w-full border px-3 py-2 rounded" {...bindDate("memberSince")} /></Field>
        <Field label="Phone"><input className="w-full border px-3 py-2 rounded" {...bind("memberPhoneNum")} /></Field>
        <Field label="Email"><input className="w-full border px-3 py-2 rounded" type="email" {...bind("memberEmail")} /></Field>
        <Field label="Role"><input className="w-full border px-3 py-2 rounded" {...bind("memberRole")} /></Field>
      </Section>

      <Section title="Baptism">
        <Field label="Date"><input type="date" className="w-full border px-3 py-2 rounded" {...bindDate("baptismDay")} /></Field>
        <Field label="Baptised by"><input className="w-full border px-3 py-2 rounded" {...bind("baptisedBy")} /></Field>
        <Field label="Church"><input className="w-full border px-3 py-2 rounded" {...bind("baptismChurch")} /></Field>
        <Field label="Representative"><input className="w-full border px-3 py-2 rounded" {...bind("baptismRepresentative")} /></Field>
      </Section>

      <Section title="Confirmation">
        <Field label="Date"><input type="date" className="w-full border px-3 py-2 rounded" {...bindDate("confirmationDay")} /></Field>
        <Field label="Confirmed by"><input className="w-full border px-3 py-2 rounded" {...bind("confirmedBy")} /></Field>
        <Field label="Church"><input className="w-full border px-3 py-2 rounded" {...bind("confirmationChurch")} /></Field>
        <Field label="Witness"><input className="w-full border px-3 py-2 rounded" {...bind("confirmationWitness")} /></Field>
      </Section>

      <Section title="Consecration">
        <Field label="Date"><input type="date" className="w-full border px-3 py-2 rounded" {...bindDate("consecrationDay")} /></Field>
        <Field label="Consecrated by"><input className="w-full border px-3 py-2 rounded" {...bind("consecratedBy")} /></Field>
        <Field label="Church"><input className="w-full border px-3 py-2 rounded" {...bind("consecrationChurch")} /></Field>
        <Field label="Representative"><input className="w-full border px-3 py-2 rounded" {...bind("consecrationRepresentative")} /></Field>
      </Section>

    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white shadow rounded p-4">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wide text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
