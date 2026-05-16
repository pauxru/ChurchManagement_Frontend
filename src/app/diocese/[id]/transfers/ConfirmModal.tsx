"use client";

// Confirm-all dialog for the transfers board. The Bishop reviews every
// pending move, picks an effective date (or "apply immediately"), edits
// the CC list inherited from diocese settings, and submits. The actual
// POST is owned by Board.tsx — this component is purely a controlled
// form that hands its state back via onSubmit.

import { useState } from "react";

export interface PendingChangeSummary {
  clergyId: number;
  name: string;
  fromLabel: string;
  toLabel: string;
}

interface Props {
  dioceseName: string;
  pendingChanges: PendingChangeSummary[];
  defaultCcList: string;
  onCancel: () => void;
  onSubmit: (opts: {
    applyImmediately: boolean;
    effectiveDate: string;
    ccList: string;
  }) => void | Promise<void>;
}

export function ConfirmModal({
  dioceseName, pendingChanges, defaultCcList, onCancel, onSubmit,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [applyImmediately, setApplyImmediately] = useState(true);
  const [effectiveDate, setEffectiveDate] = useState(today);
  const [ccList, setCcList] = useState(defaultCcList);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit({ applyImmediately, effectiveDate, ccList });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-8" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">Confirm transfers</h2>
          <p className="text-xs text-gray-600 mt-0.5">
            {pendingChanges.length} change{pendingChanges.length === 1 ? "" : "s"} on the {dioceseName} board.
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={applyImmediately}
                onChange={(e) => setApplyImmediately(e.target.checked)}
              />
              Apply immediately
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-gray-600">Effective date</span>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                disabled={applyImmediately}
                className="border rounded px-2 py-1 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <span className="text-[11px] text-gray-500 mt-0.5">
                Ignored when &quot;Apply immediately&quot; is checked.
              </span>
            </label>
            <label className="flex flex-col text-sm">
              <span className="text-gray-600">CC list (one per line)</span>
              <textarea
                value={ccList}
                onChange={(e) => setCcList(e.target.value)}
                rows={3}
                className="border rounded px-2 py-1 font-mono text-xs"
                placeholder="Most Rev Samson Muthuri&#10;Ven Joseph Gatundu"
              />
              <span className="text-[11px] text-gray-500 mt-0.5">
                Inherited from diocese settings; edit to override for this batch only.
              </span>
            </label>
          </div>

          <div className="border-t pt-3">
            <h3 className="text-sm font-semibold mb-2">Changes</h3>
            <ul className="space-y-1 text-xs text-gray-800 max-h-64 overflow-y-auto">
              {pendingChanges.map((c) => (
                <li key={c.clergyId}>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-gray-500"> · {c.fromLabel} → {c.toLabel}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-3 py-1.5 text-sm rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || pendingChanges.length === 0}
            className="px-3 py-1.5 text-sm rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
