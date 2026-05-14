"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";

interface CessMonth { periodMonth: number; status: string; amount: number | null; paymentReference: string | null; }
interface Lc {
  localChurchId: number; localChurchCode: string | null; localChurchName: string; parishName: string;
  officialsVerified: number; officialsPending: number;
  activePlans: number; upcomingEvents: number; memberCount: number;
  cessThisYear: CessMonth[];
}
interface Bishop { clergyID: number; clergyName: string; ordinationDate: string; isInCharge: boolean; }
interface Overview {
  dioceseId: number; dioceseName: string;
  bishops: Bishop[]; inChargeBishopClergyId: number | null;
  localChurches: Lc[];
}

const STATUS_COLOR: Record<string, string> = {
  Submitted: "bg-yellow-200", Verified: "bg-green-300",
  Rejected: "bg-red-300", Missing: "bg-gray-200",
};

export default function DioceseOverviewPage() {
  const params = useParams<{ id: string }>();
  const dioceseId = Number(params?.id);
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [view, setView] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiFetch<Overview>(`/Bishop/diocese/${dioceseId}/overview`, token)
      .then(setView)
      .catch((e) => setError(e.message));
  }, [dioceseId, token]);

  if (error) return <div className="container mx-auto p-6 text-red-700">{error}</div>;
  if (!view) return <div className="container mx-auto p-6">Loading...</div>;

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{view.dioceseName} — Bishop overview</h1>
          <div className="text-sm text-gray-600 mt-1">
            Bishops:{" "}
            {view.bishops.map((b) => (
              <span key={b.clergyID} className="inline-block mr-3">
                {b.clergyName}
                {b.isInCharge && <span className="ml-1 text-xs bg-blue-200 text-blue-900 px-1 rounded">In-Charge</span>}
              </span>
            ))}
          </div>
        </div>
        <Link href={`/diocese/${view.dioceseId}/transfers`}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded whitespace-nowrap">
          Clergy transfers
        </Link>
      </header>

      <section className="bg-white shadow rounded p-4">
        <h2 className="font-semibold mb-3">Cess this year</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Local Church</th>
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={i} className="p-2 w-10 text-center">{new Date(0, i).toLocaleString("en", { month: "short" })}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.localChurches.map((lc) => (
                <tr key={lc.localChurchId} className="border-t">
                  <td className="p-2">
                    <Link href={`/lc/${lc.localChurchId}`} className="text-blue-700 hover:underline">
                      {lc.localChurchName}
                      {lc.localChurchCode && <span className="text-gray-500"> ({lc.localChurchCode})</span>}
                    </Link>
                  </td>
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = i + 1;
                    const month = lc.cessThisYear.find((x) => x.periodMonth === m);
                    const status = month?.status ?? "Missing";
                    const color = STATUS_COLOR[status] ?? "bg-gray-100";
                    return (
                      <td key={i} className="p-1 text-center">
                        <span title={`${status}${month?.amount ? ` — KES ${month.amount}` : ""}`}
                          className={`block w-6 h-6 rounded ${color} mx-auto`}>&nbsp;</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white shadow rounded p-4">
        <h2 className="font-semibold mb-3">Local churches</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {view.localChurches.map((lc) => (
            <Link key={lc.localChurchId} href={`/lc/${lc.localChurchId}`}
              className="bg-gray-50 border rounded p-3 hover:bg-blue-50">
              <div className="font-medium">{lc.localChurchName}{lc.localChurchCode && <span className="text-gray-500"> · {lc.localChurchCode}</span>}</div>
              <div className="text-xs text-gray-500">{lc.parishName}</div>
              <div className="mt-2 text-sm">
                {lc.memberCount} members · {lc.officialsVerified} officials · {lc.activePlans} plans · {lc.upcomingEvents} events
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
