"use client";

// Pre-board manual schedule form — the original /diocese/[id]/transfers
// UI, preserved verbatim. Reachable via the `?view=manual` query string
// after Phase 4 of the transfers-board work made the drag-and-drop board
// the default landing. Promotion / demotion transfers still flow through
// this form because the board is same-rank-only by design.

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";

// --- types mirror the BishopTransfersController response shape ---

interface Transfer {
  id: number;
  clergyId: number;
  clergyName: string | null;
  fromLevel: string;
  fromLevelID: number;
  fromRank: string;
  toLevel: string;
  toLevelID: number;
  toRank: string;
  effectiveDate: string;       // yyyy-MM-dd
  reason: string;
  reasonComment: string | null;
  status: "Scheduled" | "Applied" | "Cancelled";
  initiatedAt: string;
  initiatedByUserId: string;
  appliedAt: string | null;
  appliedByUserId: string | null;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  cancelReason: string | null;
}

// Mirror of TransferReason on the backend. Order matches the enum so the
// numeric values line up if the API ever shifts to ints.
const REASONS = [
  "PromotionAdvancement",
  "LateralReassignment",
  "Demotion",
  "Retirement",
  "Discipline",
  "Other",
] as const;
type ReasonCode = typeof REASONS[number];

// Mirror of LeadershipLevels.
const LEVELS = ["LocalChurch", "Parish", "Diocese", "ArchDiocese", "National"] as const;
type Level = typeof LEVELS[number];

// Mirror of ClergyRanks.
const RANKS = [
  "Evangelist", "ChurchLeader", "Deacon", "Pastor",
  "ArchDeacon", "Bishop", "ArchBishop", "PresidingArchbishop",
] as const;
type Rank = typeof RANKS[number];

const STATUS_PILL: Record<Transfer["status"], string> = {
  Scheduled: "bg-amber-100 text-amber-900 border-amber-300",
  Applied:   "bg-emerald-100 text-emerald-900 border-emerald-300",
  Cancelled: "bg-gray-100 text-gray-700 border-gray-300",
};

export default function ManualSchedule() {
  const params = useParams<{ id: string }>();
  const dioceseId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | Transfer["status"]>("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Schedule-form state.
  const [showForm, setShowForm] = useState(false);
  const [formClergyId, setFormClergyId] = useState<number | "">("");
  const [formLevel, setFormLevel] = useState<Level>("Diocese");
  const [formLevelID, setFormLevelID] = useState<number | "">("");
  const [formRank, setFormRank] = useState<Rank>("Bishop");
  const [formEffective, setFormEffective] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [formReason, setFormReason] = useState<ReasonCode>("PromotionAdvancement");
  const [formComment, setFormComment] = useState<string>("");

  const reload = useCallback(async () => {
    if (!token) return;
    const qs = statusFilter ? `&status=${statusFilter}` : "";
    try {
      const data = await apiFetch<Transfer[]>(
        `/Bishop/transfers?dioceseId=${dioceseId}${qs}`,
        token,
      );
      setTransfers(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [dioceseId, token, statusFilter]);

  useEffect(() => { reload(); }, [reload]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || formClergyId === "" || formLevelID === "") return;
    setBusy(true);
    try {
      await apiFetch(`/Bishop/transfers`, token, {
        method: "POST",
        json: {
          clergyId: Number(formClergyId),
          newLevel: LEVELS.indexOf(formLevel) + 1,
          newLevelID: Number(formLevelID),
          newRank: RANKS.indexOf(formRank) + 1,
          effectiveDate: formEffective,
          reason: REASONS.indexOf(formReason) + 1,
          reasonComment: formComment.trim() || null,
        },
      });
      setShowForm(false);
      setFormClergyId(""); setFormLevelID(""); setFormComment("");
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const applyOne = async (id: number) => {
    if (!token) return;
    if (!confirm("Apply this transfer now? The clergy's rank and level will change.")) return;
    setBusy(true);
    try {
      await apiFetch(`/Bishop/transfers/${id}/apply`, token, { method: "POST" });
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const applyBulk = async () => {
    if (!token || selectedIds.size === 0) return;
    if (!confirm(`Apply ${selectedIds.size} transfer(s) now?`)) return;
    setBusy(true);
    try {
      const result = await apiFetch<{ applied: number; skipped: { id: number; reason: string }[] }>(
        `/Bishop/transfers/apply-bulk`, token,
        { method: "POST", json: { transferIds: Array.from(selectedIds) } },
      );
      setSelectedIds(new Set());
      await reload();
      if (result.skipped.length > 0) {
        setError(`Applied ${result.applied}; skipped ${result.skipped.length}: ` +
          result.skipped.map((s) => `#${s.id} (${s.reason})`).join(", "));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const cancelOne = async (id: number) => {
    if (!token) return;
    const reason = prompt("Reason for cancelling this transfer?");
    if (!reason || !reason.trim()) return;
    setBusy(true);
    try {
      await apiFetch(`/Bishop/transfers/${id}/cancel`, token,
        { method: "POST", json: { reason: reason.trim() } });
      await reload();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const scheduledCount = transfers.filter((t) => t.status === "Scheduled").length;
  const selectedAllScheduled = scheduledCount > 0 &&
    transfers.filter((t) => t.status === "Scheduled").every((t) => selectedIds.has(t.id));

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <Link href={`/diocese/${dioceseId}`}
            className="text-sm text-blue-700 hover:underline">&larr; Back to diocese overview</Link>
          <h1 className="text-2xl font-bold mt-1">Clergy transfers</h1>
          <p className="text-sm text-gray-600">
            Schedule and apply moves across parishes, local churches, and ranks.
          </p>
          <Link href={`/diocese/${dioceseId}/transfers`}
            className="text-xs text-blue-700 hover:underline mt-1 inline-block">
            &larr; Back to board
          </Link>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
          {showForm ? "Close form" : "Schedule transfer"}
        </button>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 rounded p-3 text-sm">
          {error}
          <button className="ml-3 underline" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={submitSchedule}
          className="bg-white shadow rounded p-4 space-y-3 border">
          <h2 className="font-semibold">New scheduled transfer</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <label className="flex flex-col">
              <span className="text-gray-600">Clergy ID</span>
              <input type="number" required value={formClergyId}
                onChange={(e) => setFormClergyId(e.target.value === "" ? "" : Number(e.target.value))}
                className="border rounded px-2 py-1" />
            </label>
            <label className="flex flex-col">
              <span className="text-gray-600">New level</span>
              <select value={formLevel} onChange={(e) => setFormLevel(e.target.value as Level)}
                className="border rounded px-2 py-1">
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label className="flex flex-col">
              <span className="text-gray-600">New level ID</span>
              <input type="number" required value={formLevelID}
                onChange={(e) => setFormLevelID(e.target.value === "" ? "" : Number(e.target.value))}
                className="border rounded px-2 py-1" />
            </label>
            <label className="flex flex-col">
              <span className="text-gray-600">New rank</span>
              <select value={formRank} onChange={(e) => setFormRank(e.target.value as Rank)}
                className="border rounded px-2 py-1">
                {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="flex flex-col">
              <span className="text-gray-600">Effective date</span>
              <input type="date" required value={formEffective}
                onChange={(e) => setFormEffective(e.target.value)}
                className="border rounded px-2 py-1" />
            </label>
            <label className="flex flex-col">
              <span className="text-gray-600">Reason</span>
              <select value={formReason} onChange={(e) => setFormReason(e.target.value as ReasonCode)}
                className="border rounded px-2 py-1">
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="md:col-span-3 flex flex-col">
              <span className="text-gray-600">
                Comment {formReason === "Other" && <span className="text-red-700">(required)</span>}
              </span>
              <textarea value={formComment} onChange={(e) => setFormComment(e.target.value)}
                rows={2} className="border rounded px-2 py-1"
                placeholder="Optional free-text rationale" />
            </label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={busy}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded disabled:opacity-60">
              {busy ? "Scheduling..." : "Schedule"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded">Cancel</button>
          </div>
        </form>
      )}

      <section className="bg-white shadow rounded">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">Filter:</span>
            <select value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ("" | Transfer["status"]))}
              className="border rounded px-2 py-1">
              <option value="">All statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Applied">Applied</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <span className="text-gray-500">
              {transfers.length} row(s) · {scheduledCount} pending
            </span>
          </div>
          <button onClick={applyBulk}
            disabled={busy || selectedIds.size === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-3 py-1.5 rounded disabled:opacity-50">
            Apply selected ({selectedIds.size})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left w-8">
                  <input type="checkbox" checked={selectedAllScheduled}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(transfers
                          .filter((t) => t.status === "Scheduled").map((t) => t.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }} />
                </th>
                <th className="p-2 text-left">Clergy</th>
                <th className="p-2 text-left">From</th>
                <th className="p-2 text-left">To</th>
                <th className="p-2 text-left">Effective</th>
                <th className="p-2 text-left">Reason</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-gray-500">
                  No transfers yet.
                </td></tr>
              )}
              {transfers.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-2">
                    {t.status === "Scheduled" && (
                      <input type="checkbox" checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelect(t.id)} />
                    )}
                  </td>
                  <td className="p-2">
                    {t.clergyName ?? `#${t.clergyId}`}
                    <span className="text-gray-400 text-xs"> · id {t.clergyId}</span>
                  </td>
                  <td className="p-2">
                    <div>{t.fromRank}</div>
                    <div className="text-xs text-gray-500">{t.fromLevel} #{t.fromLevelID}</div>
                  </td>
                  <td className="p-2">
                    <div>{t.toRank}</div>
                    <div className="text-xs text-gray-500">{t.toLevel} #{t.toLevelID}</div>
                  </td>
                  <td className="p-2 whitespace-nowrap">{t.effectiveDate}</td>
                  <td className="p-2">
                    <div>{t.reason}</div>
                    {t.reasonComment && (
                      <div className="text-xs text-gray-500 max-w-xs truncate" title={t.reasonComment}>
                        {t.reasonComment}
                      </div>
                    )}
                  </td>
                  <td className="p-2">
                    <span className={`inline-block px-2 py-0.5 rounded border text-xs ${STATUS_PILL[t.status]}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-2 space-x-2 whitespace-nowrap">
                    {t.status === "Scheduled" && (
                      <>
                        <button onClick={() => applyOne(t.id)} disabled={busy}
                          className="text-emerald-700 hover:underline disabled:opacity-50">Apply</button>
                        <button onClick={() => cancelOne(t.id)} disabled={busy}
                          className="text-red-700 hover:underline disabled:opacity-50">Cancel</button>
                      </>
                    )}
                    {t.status === "Applied" && t.appliedAt && (
                      <span className="text-xs text-gray-500">
                        Applied {new Date(t.appliedAt).toLocaleDateString()}
                      </span>
                    )}
                    {t.status === "Cancelled" && t.cancelReason && (
                      <span className="text-xs text-gray-500" title={t.cancelReason}>
                        Cancelled
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
