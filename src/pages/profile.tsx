"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/apiClient";

// Numeric enum mirror of backend PreferredLanguage. Keep aligned with
// Models/Enums.cs::PreferredLanguage.
const LANGUAGES: { value: number; label: string }[] = [
  { value: 1, label: "English" },
  { value: 2, label: "Swahili" },
  { value: 3, label: "Kikuyu" },
];

// Shape of /Profile/me response (subset). Pulled inline so we don't drag
// auth.ts's internal Profile interface into a page module.
interface ProfilePayload {
  userId: string;
  displayName: string;
  email: string;
  phoneMasked: string | null;
  preferredLanguage: number;
  profilePictureBlobName: string | null;
  alternateEmail: string | null;
  alternatePhone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  occupation: string | null;
  bio: string | null;
  profilePhotoUrl: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}

// Form-state shape — every editable field is a string so the inputs are
// fully controlled. Non-string fields (preferredLanguage, dateOfBirth) are
// serialised on submit.
interface FormState {
  displayName: string;
  alternateEmail: string;
  alternatePhone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  city: string;
  country: string;
  occupation: string;
  bio: string;
  profilePhotoUrl: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  preferredLanguage: number;
}

function toForm(p: ProfilePayload | null): FormState {
  return {
    displayName: p?.displayName ?? "",
    alternateEmail: p?.alternateEmail ?? "",
    alternatePhone: p?.alternatePhone ?? "",
    dateOfBirth: p?.dateOfBirth ?? "",
    gender: p?.gender ?? "",
    address: p?.address ?? "",
    city: p?.city ?? "",
    country: p?.country ?? "",
    occupation: p?.occupation ?? "",
    bio: p?.bio ?? "",
    profilePhotoUrl: p?.profilePhotoUrl ?? "",
    emergencyContactName: p?.emergencyContactName ?? "",
    emergencyContactPhone: p?.emergencyContactPhone ?? "",
    preferredLanguage: p?.preferredLanguage ?? 1,
  };
}

export default function Profile() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const sessionProfile = session?.profile;
  const accessToken = session?.accessToken;

  // Local working copy of the profile — initialised from session and then
  // kept in sync with /Profile/me responses after edits land.
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [form, setForm] = useState<FormState>(() => toForm(null));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Seed from the cached session profile on first mount so the page renders
  // immediately. The session JWT only refreshes every 5 minutes (see auth.ts),
  // so the user may need to sign out / back in to see profile changes
  // reflected in the navbar UserMenu — but THIS page always shows the
  // freshest data because we hold onto the PATCH response in local state.
  useEffect(() => {
    if (sessionProfile && !profile) {
      const p = sessionProfile as unknown as ProfilePayload;
      setProfile(p);
      setForm(toForm(p));
    }
  }, [sessionProfile, profile]);

  // Redirect unauthenticated users to home (mirrors the previous behaviour).
  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  const languageLabel = useMemo(
    () => LANGUAGES.find(l => l.value === (profile?.preferredLanguage ?? 1))?.label ?? "—",
    [profile?.preferredLanguage]
  );

  if (status === "loading") return <div className="p-8">Loading...</div>;
  if (!session?.user) return null;

  const { user } = session;
  const role = user.roles?.[0];

  // Photo precedence: explicit URL the user typed in → Entra image → default.
  // User-supplied URLs render via <img> (arbitrary hosts, not whitelisted for
  // next/image); the Entra URL goes through next/image because the gravatar/
  // auth0 CDN domains are allow-listed in next.config.ts.
  const userPhotoUrl = profile?.profilePhotoUrl || null;
  const entraPhotoUrl = !userPhotoUrl ? (user.image ?? null) : null;

  function startEdit() {
    setError(null);
    setSaved(false);
    setForm(toForm(profile));
    setEditing(true);
  }

  function cancelEdit() {
    setError(null);
    setForm(toForm(profile));
    setEditing(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      // Send empty strings as empty strings — backend treats them as "clear
      // the field". DisplayName is special: empty string would leave it
      // unchanged because the service uses IsNullOrWhiteSpace there.
      const body = {
        displayName: form.displayName,
        preferredLanguage: form.preferredLanguage,
        alternateEmail: form.alternateEmail,
        alternatePhone: form.alternatePhone,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender,
        address: form.address,
        city: form.city,
        country: form.country,
        occupation: form.occupation,
        bio: form.bio,
        profilePhotoUrl: form.profilePhotoUrl,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
      };
      const updated = await apiFetch<ProfilePayload>(
        "/Profile/me",
        accessToken,
        { method: "PATCH", json: body }
      );
      setProfile(updated);
      setForm(toForm(updated));
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  // Render either the read-only display row or the input field.
  function Row({ label, value, editingChild }: { label: string; value: string | null | undefined; editingChild?: React.ReactNode }) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2.5 border-b last:border-b-0">
        <dt className="text-sm font-medium text-gray-600">{label}</dt>
        <dd className="sm:col-span-2 text-sm text-gray-900">
          {editing && editingChild ? editingChild : (value && value.length > 0 ? value : <span className="text-gray-400 italic">Not set</span>)}
        </dd>
      </div>
    );
  }

  function inputClass(extra = "") {
    return `w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 ${extra}`;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <header className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            {userPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userPhotoUrl}
                alt={profile?.displayName ?? user.name ?? "User"}
                width={80}
                height={80}
                className="rounded-full object-cover border-2 border-white shadow"
                style={{ width: 80, height: 80 }}
              />
            ) : (
              <Image
                src={entraPhotoUrl ?? "/default-profile.png"}
                alt={profile?.displayName ?? user.name ?? "User"}
                width={80}
                height={80}
                className="rounded-full object-cover border-2 border-white shadow"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {profile?.displayName || user.name}
              </h1>
              <p className="text-sm text-gray-600">{profile?.email || user.email}</p>
              {role && <p className="text-xs text-gray-500 mt-0.5">Role: {role}</p>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {!editing ? (
              <button
                type="button"
                onClick={startEdit}
                className="bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-red-800"
              >
                Edit profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="text-sm px-3 py-2 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="profile-form"
                  disabled={saving}
                  className="bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded hover:bg-red-800 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Sign out
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 text-red-800 text-sm px-3 py-2">
            {error}
          </div>
        )}
        {saved && !editing && (
          <div className="mb-4 rounded border border-green-300 bg-green-50 text-green-800 text-sm px-3 py-2">
            Profile updated. The avatar/menu may take up to 5 minutes to refresh, or sign out and back in to see changes everywhere.
          </div>
        )}

        <form id="profile-form" onSubmit={save} className="space-y-6">

          {/* Identity */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="text-base font-semibold mb-2">Identity</h2>
            <dl>
              <Row
                label="Display name"
                value={profile?.displayName}
                editingChild={
                  <input
                    type="text"
                    className={inputClass()}
                    value={form.displayName}
                    onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                    maxLength={120}
                  />
                }
              />
              <Row label="Email (Microsoft Entra)" value={profile?.email} />
              <Row
                label="Profile photo URL"
                value={profile?.profilePhotoUrl}
                editingChild={
                  <input
                    type="url"
                    className={inputClass()}
                    placeholder="https://…"
                    value={form.profilePhotoUrl}
                    onChange={e => setForm(f => ({ ...f, profilePhotoUrl: e.target.value }))}
                    maxLength={512}
                  />
                }
              />
              <Row
                label="Preferred language"
                value={languageLabel}
                editingChild={
                  <select
                    className={inputClass()}
                    value={form.preferredLanguage}
                    onChange={e => setForm(f => ({ ...f, preferredLanguage: Number(e.target.value) }))}
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                }
              />
            </dl>
          </section>

          {/* Contact */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="text-base font-semibold mb-2">Contact</h2>
            <dl>
              <Row label="Phone (verified)" value={profile?.phoneMasked} />
              <Row
                label="Alternate email"
                value={profile?.alternateEmail}
                editingChild={
                  <input
                    type="email"
                    className={inputClass()}
                    value={form.alternateEmail}
                    onChange={e => setForm(f => ({ ...f, alternateEmail: e.target.value }))}
                    maxLength={254}
                  />
                }
              />
              <Row
                label="Alternate phone"
                value={profile?.alternatePhone}
                editingChild={
                  <input
                    type="tel"
                    className={inputClass()}
                    value={form.alternatePhone}
                    onChange={e => setForm(f => ({ ...f, alternatePhone: e.target.value }))}
                    maxLength={64}
                  />
                }
              />
              <Row
                label="Address"
                value={profile?.address}
                editingChild={
                  <input
                    type="text"
                    className={inputClass()}
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    maxLength={200}
                  />
                }
              />
              <Row
                label="City"
                value={profile?.city}
                editingChild={
                  <input
                    type="text"
                    className={inputClass()}
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    maxLength={120}
                  />
                }
              />
              <Row
                label="Country"
                value={profile?.country}
                editingChild={
                  <input
                    type="text"
                    className={inputClass()}
                    value={form.country}
                    onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    maxLength={120}
                  />
                }
              />
            </dl>
          </section>

          {/* Personal */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="text-base font-semibold mb-2">Personal</h2>
            <dl>
              <Row
                label="Date of birth"
                value={profile?.dateOfBirth}
                editingChild={
                  <input
                    type="date"
                    className={inputClass()}
                    value={form.dateOfBirth}
                    onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                  />
                }
              />
              <Row
                label="Gender"
                value={profile?.gender}
                editingChild={
                  <input
                    type="text"
                    className={inputClass()}
                    placeholder="Male / Female / Prefer not to say"
                    value={form.gender}
                    onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                    maxLength={20}
                  />
                }
              />
              <Row
                label="Occupation"
                value={profile?.occupation}
                editingChild={
                  <input
                    type="text"
                    className={inputClass()}
                    value={form.occupation}
                    onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))}
                    maxLength={120}
                  />
                }
              />
              <Row
                label="Bio"
                value={profile?.bio}
                editingChild={
                  <textarea
                    className={inputClass("min-h-[100px]")}
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    maxLength={2000}
                  />
                }
              />
            </dl>
          </section>

          {/* Emergency */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="text-base font-semibold mb-2">Emergency contact</h2>
            <dl>
              <Row
                label="Contact name"
                value={profile?.emergencyContactName}
                editingChild={
                  <input
                    type="text"
                    className={inputClass()}
                    value={form.emergencyContactName}
                    onChange={e => setForm(f => ({ ...f, emergencyContactName: e.target.value }))}
                    maxLength={200}
                  />
                }
              />
              <Row
                label="Contact phone"
                value={profile?.emergencyContactPhone}
                editingChild={
                  <input
                    type="tel"
                    className={inputClass()}
                    value={form.emergencyContactPhone}
                    onChange={e => setForm(f => ({ ...f, emergencyContactPhone: e.target.value }))}
                    maxLength={64}
                  />
                }
              />
            </dl>
          </section>
        </form>
      </div>
    </div>
  );
}
