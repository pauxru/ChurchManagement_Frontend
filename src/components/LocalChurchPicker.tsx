"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";

export interface LcLookup {
  id: number;
  name: string;
  code?: string | null;
  parishName?: string | null;
  dioceseName?: string | null;
  archDioceseName?: string | null;
}

interface Props {
  onPick: (lc: LcLookup) => void;
}

// Two ways to pick: by short code (primary, exact) or by name (fallback, fuzzy).
export function LocalChurchPicker({ onPick }: Props) {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [code, setCode] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<LcLookup[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced name search.
  useEffect(() => {
    if (!token || search.trim().length < 2) { setResults([]); return; }
    const handle = setTimeout(async () => {
      setBusy(true); setError(null);
      try {
        const r = await apiFetch<LcLookup[]>(`/Lookup/local-churches?search=${encodeURIComponent(search.trim())}`, token);
        setResults(r);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [search, token]);

  async function lookupByCode() {
    if (!token || !code.trim()) return;
    setBusy(true); setError(null);
    try {
      const r = await apiFetch<LcLookup>(`/Lookup/local-churches/by-code/${encodeURIComponent(code.trim().toUpperCase())}`, token);
      onPick(r);
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg.includes("404") ? "No church found with that code." : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Church code</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. GAT-001"
            className="flex-1 border px-3 py-2 rounded uppercase font-mono"
          />
          <button
            onClick={lookupByCode}
            disabled={busy || !code.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            Use code
          </button>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500">or search by name</div>

      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type at least 2 letters"
          className="w-full border px-3 py-2 rounded"
        />
        {busy && <p className="mt-2 text-sm text-gray-500">Searching...</p>}
        {results.length > 0 && (
          <ul className="mt-2 border rounded divide-y bg-white">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => onPick(r)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                >
                  <div className="font-medium">{r.name}{r.code ? ` (${r.code})` : ""}</div>
                  <div className="text-xs text-gray-500">
                    {[r.parishName, r.dioceseName, r.archDioceseName].filter(Boolean).join(" · ")}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-red-700 text-sm">{error}</p>}
    </div>
  );
}
