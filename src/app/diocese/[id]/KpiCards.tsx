"use client";

// Top-of-dashboard metric tiles. Each card links to a relevant management
// page when one exists. Numbers come from the Bishop overview payload +
// fetched-once aggregates (parishes count, total active clergy, current
// month cess bucket counts). Zero values render a friendly "No X yet"
// rather than a stark "0" — matches the empty-state convention used on
// the LC overview.

import Link from "next/link";

interface KpiCardProps {
  label: string;
  value: number | string;
  subLine?: string | null;
  href?: string;
  emptyMessage?: string; // shown instead of "0" when value === 0
}

function KpiCard({ label, value, subLine, href, emptyMessage }: KpiCardProps) {
  const isEmpty = typeof value === "number" && value === 0 && emptyMessage;
  const inner = (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition h-full">
      {isEmpty ? (
        <div className="text-sm text-gray-500 italic">{emptyMessage}</div>
      ) : (
        <div className="text-3xl font-bold text-red-900 leading-none">
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
      )}
      <div className="text-sm text-gray-600 mt-2 font-medium">{label}</div>
      {subLine && <div className="text-xs text-gray-500 mt-1">{subLine}</div>}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

interface Props {
  localChurchCount: number;
  parishCount: number | null; // null = still loading / failed
  memberCount: number;
  activeClergyCount: number | null;
  officialsVerified: number;
  officialsPending: number;
  cessVerifiedThisMonth: number;
  cessSubmittedThisMonth: number;
  cessTotalThisMonth: number;
}

export function KpiCards({
  localChurchCount,
  parishCount,
  memberCount,
  activeClergyCount,
  officialsVerified,
  officialsPending,
  cessVerifiedThisMonth,
  cessSubmittedThisMonth,
  cessTotalThisMonth,
}: Props) {
  const officialsSub = officialsPending > 0
    ? `${officialsVerified} verified · ${officialsPending} pending`
    : `${officialsVerified} verified`;

  const cessValue = cessTotalThisMonth === 0
    ? 0
    : `${cessVerifiedThisMonth} / ${cessTotalThisMonth}`;
  const cessSub = cessTotalThisMonth === 0
    ? null
    : cessSubmittedThisMonth > 0
      ? `${cessSubmittedThisMonth} awaiting verification`
      : "verified this month";

  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 border-b border-gray-200 pb-2 mb-4">
        At a glance
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Local Churches"
          value={localChurchCount}
          href="/churches"
          emptyMessage="No churches yet"
        />
        <KpiCard
          label="Parishes"
          value={parishCount ?? "—"}
          emptyMessage="No parishes yet"
        />
        <KpiCard
          label="Members"
          value={memberCount}
          href="/churches"
          emptyMessage="No members yet"
        />
        <KpiCard
          label="Clergy"
          value={activeClergyCount ?? "—"}
          href="/clergy"
          emptyMessage="No clergy yet"
        />
        <KpiCard
          label="Officials"
          value={officialsVerified + officialsPending}
          subLine={officialsSub}
          href="/admin/officials"
          emptyMessage="No officials yet"
        />
        <KpiCard
          label="Cess this month"
          value={cessValue}
          subLine={cessSub}
        />
      </div>
    </section>
  );
}
