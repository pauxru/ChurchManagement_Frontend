"use client";

// Route is /lc/[id]/plans for backwards compat — the UI concept is "Projects".
// Backend table + endpoint stay as ChurchPlan / /Plans.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

interface Project {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: number;
  category: string | null;
  budget: number | null;
  actualSpend: number | null;
  notes: string | null;
}

const STATUS_LABEL: Record<number, string> = {
  1: "Draft",
  2: "Active",
  3: "Completed",
  4: "Cancelled",
};

const STATUS_STYLES: Record<number, string> = {
  1: "bg-gray-100 text-gray-700 ring-gray-200",
  2: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  3: "bg-blue-50 text-blue-700 ring-blue-200",
  4: "bg-rose-50 text-rose-700 ring-rose-200",
};

const CATEGORY_SUGGESTIONS = ["Building", "Outreach", "Discipleship", "Youth", "Worship", "Welfare", "Admin"];

type FormState = {
  title: string;
  category: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: string;
  actualSpend: string;
  status: number;
  notes: string;
};

const emptyForm = (): FormState => ({
  title: "",
  category: "",
  description: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  budget: "",
  actualSpend: "",
  status: 1,
  notes: "",
});

function formatKes(n: number | null | undefined): string {
  if (n == null) return "—";
  return `KES ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function ProjectsPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<number | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setProjects(await apiFetch<Project[]>(`/Lc/${lcId}/Plans`, token));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [lcId, token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(
    () => (filter === "all" ? projects : projects.filter((p) => p.status === filter)),
    [projects, filter],
  );

  const counts = useMemo(() => {
    const c: Record<number | "all", number> = { all: projects.length, 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const p of projects) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [projects]);

  async function submit() {
    if (!token) return;
    setSaving(true);
    try {
      await apiFetch(`/Lc/${lcId}/Plans`, token, {
        method: "POST",
        json: {
          title: form.title.trim(),
          description: form.description.trim() || null,
          startDate: form.startDate,
          endDate: form.endDate || null,
          status: form.status,
          category: form.category.trim() || null,
          budget: form.budget === "" ? null : Number(form.budget),
          actualSpend: form.actualSpend === "" ? null : Number(form.actualSpend),
          notes: form.notes.trim() || null,
        },
      });
      setForm(emptyForm());
      setShowModal(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto px-6 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Projects</h2>
          <p className="text-sm text-gray-500 mt-1">
            Upcoming and ongoing work in the local church — building, outreach, discipleship and more.
          </p>
        </div>
        <button
          onClick={() => {
            setForm(emptyForm());
            setShowModal(true);
          }}
          className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-md shadow-sm text-sm font-medium"
        >
          + New project
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded mb-4 text-sm">{error}</div>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        {(["all", 1, 2, 3, 4] as const).map((k) => {
          const label = k === "all" ? "All" : STATUS_LABEL[k];
          const active = filter === k;
          return (
            <button
              key={String(k)}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium ring-1 transition ${
                active
                  ? "bg-gray-900 text-white ring-gray-900"
                  : "bg-white text-gray-700 ring-gray-200 hover:ring-gray-400"
              }`}
            >
              {label} <span className="ml-1 opacity-60">{counts[k] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-lg p-10 text-center text-gray-500">
          {projects.length === 0 ? (
            <>
              <p className="font-medium text-gray-700">No projects yet</p>
              <p className="text-sm mt-1">Click <span className="font-medium">+ New project</span> to add upcoming work.</p>
            </>
          ) : (
            <p>No projects match this filter.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const overBudget =
              p.budget != null && p.actualSpend != null && p.actualSpend > p.budget;
            const pct =
              p.budget && p.budget > 0 && p.actualSpend != null
                ? Math.min(100, Math.round((p.actualSpend / p.budget) * 100))
                : null;
            return (
              <div
                key={p.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition border border-gray-100 p-5 flex flex-col"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 leading-tight">{p.title}</h3>
                  <span
                    className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-1 rounded-full ring-1 whitespace-nowrap ${
                      STATUS_STYLES[p.status] ?? STATUS_STYLES[1]
                    }`}
                  >
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>

                {p.category && (
                  <div className="mt-2">
                    <span className="inline-block text-xs font-medium text-red-700 bg-red-50 ring-1 ring-red-100 px-2 py-0.5 rounded">
                      {p.category}
                    </span>
                  </div>
                )}

                {p.description && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-3">{p.description}</p>
                )}

                <div className="mt-4 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{p.startDate}</span>
                  {p.endDate ? <> <span className="mx-1">→</span> <span className="font-medium text-gray-700">{p.endDate}</span></> : <span className="ml-1">(open-ended)</span>}
                </div>

                {(p.budget != null || p.actualSpend != null) && (
                  <div className="mt-4 border-t pt-3">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Spend</span>
                      <span className={overBudget ? "text-rose-600 font-semibold" : "text-gray-700 font-medium"}>
                        {formatKes(p.actualSpend)} / {formatKes(p.budget)}
                      </span>
                    </div>
                    {pct != null && (
                      <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${overBudget ? "bg-rose-500" : "bg-emerald-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {p.notes && (
                  <details className="mt-3 text-xs text-gray-600">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Notes</summary>
                    <p className="mt-2 whitespace-pre-wrap">{p.notes}</p>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !saving && setShowModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">New project</h3>
              <p className="text-xs text-gray-500 mt-1">Capture upcoming work — building, outreach, discipleship, etc.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                  placeholder="e.g. Sanctuary roof replacement"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    list="proj-categories"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                    placeholder="Building / Outreach / ..."
                  />
                  <datalist id="proj-categories">
                    {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: Number(e.target.value) })}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                  >
                    <option value={1}>Draft</option>
                    <option value={2}>Active</option>
                    <option value={3}>Completed</option>
                    <option value={4}>Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                  placeholder="Short summary of what this project is about"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End date <span className="text-gray-400">(optional)</span></label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Budget (KES)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                    placeholder="e.g. 250000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Actual spend (KES)</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.actualSpend}
                    onChange={(e) => setForm({ ...form, actualSpend: e.target.value })}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                  placeholder="Progress notes, contractors, decisions made..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2 sticky bottom-0">
              <button
                onClick={() => setShowModal(false)}
                disabled={saving}
                className="px-4 py-2 rounded-md text-sm border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving || !form.title.trim()}
                className="px-4 py-2 rounded-md text-sm bg-red-700 hover:bg-red-800 text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
