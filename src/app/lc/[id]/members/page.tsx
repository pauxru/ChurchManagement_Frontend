"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";
import { RoleTier } from "@/auth";

interface Member {
  memberID: number;
  memberName: string;
  alias: string | null;
  memberSex: string;
  memberAge: number | null;
  memberPhoneNum: string | null;
  memberEmail: string | null;
  memberRole: string | null;
  isActive: boolean | null;
}

// CSV columns expected for bulk paste — keep this list short so users can
// type or paste from a simple spreadsheet. Anything missing is left blank.
const CSV_HEADERS = ["memberName", "memberSex", "memberPhoneNum", "memberEmail", "memberRole"] as const;

export default function MembersPage() {
  const params = useParams<{ id: string }>();
  const lcId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;
  const tier = session?.profile?.roleLabel?.tier ?? 0;
  const isAdmin = tier >= RoleTier.Bishop;

  const [list, setList] = useState<Member[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add-one form state
  const [name, setName] = useState("");
  const [sex, setSex] = useState("M");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Bulk paste state
  const [csv, setCsv] = useState("");
  const [bulkPreview, setBulkPreview] = useState<Record<string, string>[]>([]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const url = `/Lc/${lcId}/Members${showInactive ? "?includeInactive=true" : ""}`;
      setList(await apiFetch<Member[]>(url, token));
    } catch (e) { setError((e as Error).message); }
  }, [lcId, token, showInactive]);
  useEffect(() => { refresh(); }, [refresh]);

  async function addOne() {
    if (!token || !name) return;
    try {
      await apiFetch(`/Admin/member`, token, {
        method: "POST",
        json: {
          memberName: name,
          memberSex: sex,
          memberLocalChurchID: lcId,
          memberSince: new Date().toISOString(),
          memberPhoneNum: phone || null,
          memberEmail: email || null,
          isActive: true,
        },
      });
      setName(""); setPhone(""); setEmail(""); setSex("M");
      refresh();
    } catch (e) { setError((e as Error).message); }
  }

  function parseCsv() {
    setError(null);
    const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) { setBulkPreview([]); return; }
    // First line can be a header. If it matches our known columns, use it; else treat all lines as data with the default header order.
    let header = CSV_HEADERS as readonly string[];
    let dataLines = lines;
    const firstCols = lines[0].split(",").map(c => c.trim());
    if (firstCols.some(c => (CSV_HEADERS as readonly string[]).includes(c))) {
      header = firstCols;
      dataLines = lines.slice(1);
    }
    const rows = dataLines.map(line => {
      const cols = line.split(",").map(c => c.trim());
      const r: Record<string, string> = {};
      header.forEach((h, i) => { r[h] = cols[i] ?? ""; });
      return r;
    });
    setBulkPreview(rows);
  }

  async function commitBulk() {
    if (!token || bulkPreview.length === 0) return;
    const payload = bulkPreview.map(r => ({
      memberName: r.memberName ?? "",
      memberSex: r.memberSex || "M",
      memberLocalChurchID: lcId,
      memberSince: new Date().toISOString(),
      memberPhoneNum: r.memberPhoneNum || null,
      memberEmail: r.memberEmail || null,
      memberRole: r.memberRole || null,
      isActive: true,
    }));
    try {
      await apiFetch(`/Admin/members/bulk`, token, { method: "POST", json: payload });
      setCsv(""); setBulkPreview([]);
      refresh();
    } catch (e) { setError((e as Error).message); }
  }

  async function softDelete(m: Member) {
    if (!token) return;
    if (!confirm(`Deactivate ${m.memberName}? They can be restored later.`)) return;
    try {
      await apiFetch(`/Lc/${lcId}/Members/${m.memberID}`, token, { method: "DELETE" });
      refresh();
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Members</h2>
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Show inactive
          </label>
        )}
      </div>

      <section className="bg-white shadow rounded p-4 space-y-2">
        <h3 className="font-medium">Add one member</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="border px-3 py-2 rounded" />
          <select value={sex} onChange={(e) => setSex(e.target.value)} className="border px-3 py-2 rounded">
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="border px-3 py-2 rounded" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="border px-3 py-2 rounded" />
        </div>
        <button onClick={addOne} disabled={!name} className="bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50">Add member</button>
      </section>

      <section className="bg-white shadow rounded p-4 space-y-2">
        <h3 className="font-medium">Bulk import (CSV)</h3>
        <p className="text-xs text-gray-600">
          Paste comma-separated rows. Columns: <code>{CSV_HEADERS.join(", ")}</code>.
          First line can be a header. Missing values are left blank.
        </p>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={5}
          className="w-full border px-3 py-2 rounded font-mono text-sm"
          placeholder={`memberName,memberSex,memberPhoneNum,memberEmail,memberRole\nJane Doe,F,0700111222,jane@example.com,Member`}
        />
        <div className="flex items-center gap-2">
          <button onClick={parseCsv} className="bg-gray-200 text-gray-800 px-3 py-1 rounded">Preview</button>
          {bulkPreview.length > 0 && (
            <button onClick={commitBulk} className="bg-green-700 text-white px-3 py-1 rounded">
              Insert {bulkPreview.length} row{bulkPreview.length === 1 ? "" : "s"}
            </button>
          )}
        </div>
        {bulkPreview.length > 0 && (
          <pre className="bg-gray-50 border rounded p-2 text-xs overflow-x-auto">
            {JSON.stringify(bulkPreview, null, 2)}
          </pre>
        )}
      </section>

      {error && <div className="text-red-700">{error}</div>}

      <section className="bg-white shadow rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Sex</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-4 text-gray-500 text-center">No members yet.</td></tr>
            )}
            {list.map((m) => {
              const active = m.isActive === null || m.isActive === true;
              return (
                <tr key={m.memberID} className={`border-t ${active ? "" : "opacity-60"}`}>
                  <td className="px-3 py-2 font-medium">{m.memberName}</td>
                  <td className="px-3 py-2">{m.memberSex}</td>
                  <td className="px-3 py-2">{m.memberPhoneNum ?? "—"}</td>
                  <td className="px-3 py-2">{m.memberEmail ?? "—"}</td>
                  <td className="px-3 py-2">{m.memberRole ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>
                      {active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right space-x-3">
                    <Link href={`/lc/${lcId}/members/${m.memberID}`} className="text-blue-700 underline">Edit</Link>
                    {active && (
                      <button onClick={() => softDelete(m)} className="text-red-700 underline">Delete</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
