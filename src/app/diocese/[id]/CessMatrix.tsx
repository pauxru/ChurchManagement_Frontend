"use client";

// Year-to-date cess matrix. Rows = local churches, columns = Jan..Dec.
// The first column (LC name + code chip) is sticky on horizontal scroll
// so the operator never loses track of which row they're reading. Cell
// tooltips reveal the payment reference + amount + date for Submitted /
// Verified statuses. Below the table sits a single YTD verified-cess
// summary row.

import Link from "next/link";
import type { Lc } from "./types";
import { formatKes } from "./types";

const STATUS_COLOR: Record<string, string> = {
  Submitted: "bg-yellow-200",
  Verified: "bg-green-300",
  Rejected: "bg-red-300",
  Missing: "bg-gray-200",
};

const STATUS_LABEL: Record<string, string> = {
  Submitted: "Submitted",
  Verified: "Verified",
  Rejected: "Rejected",
  Missing: "Missing",
};

interface Props {
  localChurches: Lc[];
}

export function CessMatrix({ localChurches }: Props) {
  // YTD total of verified cess across the diocese.
  const ytdVerified = localChurches.reduce((acc, lc) => {
    return acc + lc.cessThisYear
      .filter((m) => m.status === "Verified" && m.amount != null)
      .reduce((a, m) => a + (m.amount ?? 0), 0);
  }, 0);

  return (
    <section>
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-2 mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Cess this year
        </h2>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={`inline-block w-3 h-3 rounded ${STATUS_COLOR[k]}`} />
              {v}
            </span>
          ))}
        </div>
      </div>

      {localChurches.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No local churches yet.</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left font-semibold border-b border-gray-200 min-w-[14rem]">
                    Local Church
                  </th>
                  {Array.from({ length: 12 }, (_, i) => (
                    <th
                      key={i}
                      className="px-2 py-3 text-center font-semibold w-10 border-b border-gray-200"
                    >
                      {new Date(0, i).toLocaleString("en", { month: "short" })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {localChurches.map((lc, rowIdx) => (
                  <tr
                    key={lc.localChurchId}
                    className={rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                  >
                    <td
                      className={`sticky left-0 z-10 px-4 py-2 border-b border-gray-100 ${
                        rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      }`}
                    >
                      <Link
                        href={`/lc/${lc.localChurchId}`}
                        className="text-red-800 hover:underline font-medium"
                      >
                        {lc.localChurchName}
                      </Link>
                      {lc.localChurchCode && (
                        <span className="ml-2 text-[10px] tracking-wide uppercase bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-semibold">
                          {lc.localChurchCode}
                        </span>
                      )}
                      <div className="text-xs text-gray-500 mt-0.5">{lc.parishName}</div>
                    </td>
                    {Array.from({ length: 12 }, (_, i) => {
                      const m = i + 1;
                      const month = lc.cessThisYear.find((x) => x.periodMonth === m);
                      const status = month?.status ?? "Missing";
                      const color = STATUS_COLOR[status] ?? "bg-gray-100";
                      const tooltipParts: string[] = [status];
                      if (month?.amount != null) {
                        tooltipParts.push(formatKes(month.amount));
                      }
                      if (month?.paymentReference) {
                        tooltipParts.push(`Ref: ${month.paymentReference}`);
                      }
                      return (
                        <td
                          key={i}
                          className="px-1 py-2 text-center border-b border-gray-100"
                        >
                          <span
                            title={tooltipParts.join(" · ")}
                            className={`block w-6 h-6 rounded ${color} mx-auto`}
                          >
                            &nbsp;
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* YTD summary footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-sm">
            <span className="text-gray-600">Year-to-date verified cess</span>
            <span className="font-bold text-red-900">{formatKes(ytdVerified)}</span>
          </div>
        </div>
      )}
    </section>
  );
}
