"use client";

// Shared form for POST /Admin/clergy. Reachable from two surfaces:
//   - /admin/clergy        — the management table's "+ Create clergy" button
//   - /diocese/[id]        — the hero strip's quick-action, with dioceseIdFilter
//                            pre-pinning the dropdowns to the current diocese.
//
// The Level dropdown is derived from the Rank and rendered read-only — the
// backend re-derives it on submit too (see AdminPeopleController.CreateClergy),
// but we also send `level` explicitly so a forged payload with a mismatched
// (rank, level) is rejected with 400 instead of silently coerced.

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

interface CreateClergyFormProps {
  // Pre-fills + restricts the level dropdown. When provided, Parish / LC
  // lookups are scoped to this diocese; Bishop creations pin to it too.
  dioceseIdFilter?: number;
  onCreated?: (newClergyId: number) => void;
  onCancel?: () => void;
}

// 1-indexed Models/Enums.cs ClergyRanks. Keep in sync with the backend
// enum order — System.Text.Json deserialises by numeric value.
const RANK_OPTIONS: { value: number; label: string }[] = [
  { value: 8, label: "Presiding Archbishop" },
  { value: 7, label: "Archbishop" },
  { value: 6, label: "Bishop" },
  { value: 5, label: "Archdeacon" },
  { value: 4, label: "Pastor" },
  { value: 3, label: "Deacon" },
  { value: 2, label: "Church Leader" },
  { value: 1, label: "Evangelist" },
];

// 1-indexed Models/Enums.cs LeadershipLevels. Used for the read-only Level
// display + sent as the explicit `level` on the wire.
const LEVEL_LABEL: Record<number, string> = {
  1: "Local Church",
  2: "Parish",
  3: "Diocese",
  4: "Archdiocese",
  5: "National",
};

// Mirrors AdminPeopleController.ResolveLevelForRank — derive the operating
// level from the picked rank. Keep in sync with backend if a new rank lands.
function levelForRank(rank: number): number {
  if (rank === 1 || rank === 2 || rank === 3) return 1; // LocalChurch
  if (rank === 4 || rank === 5) return 2;               // Parish
  if (rank === 6) return 3;                              // Diocese
  if (rank === 7) return 4;                              // ArchDiocese
  if (rank === 8) return 5;                              // National
  return 1;
}

// Hard-coded archdiocese list. The backend doesn't yet expose
// /public/archdioceses, and the rest of the app already pins "Nairobi"
// everywhere (Navbar, footers, DioceseHero fallback). Replace with a fetch
// once /public/archdioceses lands.
const ARCHDIOCESES: { id: number; name: string }[] = [
  { id: 1, name: "Nairobi" },
];

interface DioceseOption { dioceseId: number; dioceseName: string }
interface ParishOption  { parishId: number; parishName: string }
interface LcOption      { localChurchId: number; localChurchName: string }

export default function CreateClergyForm({
  dioceseIdFilter,
  onCreated,
  onCancel,
}: CreateClergyFormProps) {
  const { data: session } = useSession();
  const token = session?.accessToken;

  // Form state
  const [clergyName, setClergyName] = useState("");
  const [clergyRank, setClergyRank] = useState<number>(4); // Pastor default
  const [levelId, setLevelId] = useState<number | "">("");
  const [ordinationDate, setOrdinationDate] = useState<string>("");
  const [ordainedBy, setOrdainedBy] = useState("");
  const [ordinationChurch, setOrdinationChurch] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isInCharge, setIsInCharge] = useState(false);

  // Lookup data
  const [dioceses, setDioceses] = useState<DioceseOption[]>([]);
  const [parishes, setParishes] = useState<ParishOption[]>([]);
  const [localChurches, setLocalChurches] = useState<LcOption[]>([]);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const derivedLevel = useMemo(() => levelForRank(clergyRank), [clergyRank]);

  // Reset the LevelID selection whenever the rank (and therefore the level
  // dropdown source) changes. Without this, switching from Pastor → Bishop
  // would carry over a parish id and look like a UI bug.
  useEffect(() => {
    setLevelId("");
  }, [clergyRank]);

  // Fetch the level's options whenever the derived level changes.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) return;
      setLookupBusy(true);
      setLookupError(null);
      try {
        if (derivedLevel === 1) {
          // LocalChurch list. Scope to dioceseIdFilter when supplied.
          const dId = dioceseIdFilter ?? 1;
          const data = await apiFetch<LcOption[]>(`/Churches/diocese/${dId}`, token);
          if (!cancelled) setLocalChurches(data ?? []);
        } else if (derivedLevel === 2) {
          // Parish list scoped to the diocese.
          const dId = dioceseIdFilter ?? 1;
          const data = await apiFetch<ParishOption[]>(`/Churches/diocese-parishes/${dId}`, token);
          if (!cancelled) setParishes(data ?? []);
        } else if (derivedLevel === 3) {
          // Diocese list. When a filter is supplied we still let the user
          // pick — Bishops are explicitly placed even on the dashboard.
          const data = await apiFetch<DioceseOption[]>(`/Churches/diocese`, token);
          if (!cancelled) setDioceses(data ?? []);
          // Auto-select the filter when we have one.
          if (!cancelled && dioceseIdFilter) setLevelId(dioceseIdFilter);
        } else if (derivedLevel === 4) {
          // Archdiocese — use the hard-coded list above until the API exposes one.
          if (!cancelled && ARCHDIOCESES.length === 1) setLevelId(ARCHDIOCESES[0].id);
        } else if (derivedLevel === 5) {
          // National — singleton id=1.
          if (!cancelled) setLevelId(1);
        }
      } catch (e) {
        if (!cancelled) {
          setLookupError(
            e instanceof Error ? e.message : "Failed to load options for this level.",
          );
        }
      } finally {
        if (!cancelled) setLookupBusy(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [derivedLevel, dioceseIdFilter, token]);

  const canSubmit =
    clergyName.trim().length > 0 &&
    levelId !== "" &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (!token) {
      setSubmitError("Sign-in required.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    try {
      const body: Record<string, unknown> = {
        clergyName: clergyName.trim(),
        clergyRank,
        level: derivedLevel,
        levelID: Number(levelId),
        ordainedBy: ordainedBy || "",
        ordinationChurch: ordinationChurch || "",
        description: description || null,
        photoUrl: photoUrl || null,
        isInCharge,
      };
      if (ordinationDate) body.ordinationDate = ordinationDate;

      const created = await apiFetch<{ clergyID: number }>("/Admin/clergy", token, {
        method: "POST",
        json: body,
      });
      onCreated?.(created.clergyID);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create clergy.";
      setSubmitError(
        msg === "Forbidden"
          ? "You don't have permission to create clergy at this level."
          : msg,
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ----- render level-ID dropdown options -----

  function renderLevelIdOptions() {
    if (derivedLevel === 1) {
      return localChurches.map((lc) => (
        <option key={lc.localChurchId} value={lc.localChurchId}>
          {lc.localChurchName}
        </option>
      ));
    }
    if (derivedLevel === 2) {
      return parishes.map((p) => (
        <option key={p.parishId} value={p.parishId}>
          {p.parishName}
        </option>
      ));
    }
    if (derivedLevel === 3) {
      return dioceses.map((d) => (
        <option key={d.dioceseId} value={d.dioceseId}>
          {d.dioceseName}
        </option>
      ));
    }
    if (derivedLevel === 4) {
      return ARCHDIOCESES.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ));
    }
    if (derivedLevel === 5) {
      return (
        <option value={1}>National Church</option>
      );
    }
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Clergy name <span className="text-red-600">*</span>
        </label>
        <input
          type="text"
          value={clergyName}
          onChange={(e) => setClergyName(e.target.value)}
          required
          placeholder="John Mwangi"
          className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          Bare given + family name; honorifics like &quot;Pst.&quot; or &quot;Bishop&quot;
          are stripped on save.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Rank</label>
          <select
            value={clergyRank}
            onChange={(e) => setClergyRank(Number(e.target.value))}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white"
          >
            {RANK_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Level</label>
          <input
            type="text"
            value={LEVEL_LABEL[derivedLevel] ?? "—"}
            disabled
            className="mt-1 w-full border border-gray-200 rounded px-3 py-2 bg-gray-100 text-gray-600"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Assignment <span className="text-red-600">*</span>
        </label>
        <select
          value={levelId}
          onChange={(e) => setLevelId(e.target.value === "" ? "" : Number(e.target.value))}
          required
          disabled={lookupBusy}
          className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-white disabled:bg-gray-100"
        >
          <option value="">
            {lookupBusy ? "Loading…" : `Select ${LEVEL_LABEL[derivedLevel]?.toLowerCase() ?? "assignment"}`}
          </option>
          {renderLevelIdOptions()}
        </select>
        {lookupError && (
          <p className="mt-1 text-xs text-red-600">{lookupError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Ordination date</label>
          <input
            type="date"
            value={ordinationDate}
            onChange={(e) => setOrdinationDate(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Ordained by</label>
          <input
            type="text"
            value={ordainedBy}
            onChange={(e) => setOrdainedBy(e.target.value)}
            placeholder="e.g. Most Rev Muthuri"
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Ordination church</label>
        <input
          type="text"
          value={ordinationChurch}
          onChange={(e) => setOrdinationChurch(e.target.value)}
          placeholder="e.g. St. Pauls Cathedral"
          className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Photo URL</label>
        <input
          type="text"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          placeholder="/bishops/<filename>.jpg or https://..."
          className="mt-1 w-full border border-gray-300 rounded px-3 py-2 font-mono text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          Drop the JPG into the frontend repo&apos;s <code>public/bishops/</code>
          {" "}folder, redeploy, then paste <code>/bishops/&lt;filename&gt;.jpg</code> here.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description / bio</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isInCharge}
          onChange={(e) => setIsInCharge(e.target.checked)}
        />
        Mark as in-charge at this assignment
        <span className="text-xs text-gray-500">
          (lead pastor / lead deacon — usually toggled later via the in-charge UI)
        </span>
      </label>

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded text-sm">
          {submitError}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="bg-red-700 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create clergy"}
        </button>
      </div>
    </form>
  );
}
