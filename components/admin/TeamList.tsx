"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, UserCheck } from "lucide-react";
import type { TeamRow } from "@/lib/admin";
import { formatDuration } from "@/lib/format";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "waiting", label: "Not in" },
  { key: "checkin", label: "Check-in" },
  { key: "travel", label: "Travelling" },
  { key: "solving", label: "Solving" },
  { key: "finished", label: "Finished" },
] as const;

export const STATUS_STYLE: Record<TeamRow["status"], string> = {
  waiting: "bg-ink-800 text-ink-400",
  checkin: "bg-warn/15 text-warn",
  travel: "bg-sky-400/15 text-sky-300",
  solving: "bg-gold-400/15 text-gold-300",
  finished: "bg-good/15 text-good",
};

export function TeamList({ rows, labels }: { rows: TeamRow[]; labels: Record<number, string> }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<(typeof FILTERS)[number]["key"]>("all");

  const shown = rows.filter(
    (r) => (f === "all" || r.status === f) && (r.code + " " + r.name).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <input className="input h-11 pl-10 text-base" placeholder="Search teams" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          {FILTERS.map((x) => {
            const n = x.key === "all" ? rows.length : rows.filter((r) => r.status === x.key).length;
            return (
              <button
                key={x.key}
                onClick={() => setF(x.key)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  f === x.key ? "border-gold-400/50 bg-gold-400/10 text-gold-300" : "border-ink-700 text-ink-300"
                }`}
              >
                {x.label} <span className="text-ink-500">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {shown.map((r) => (
          <li key={r.id}>
            <Link href={`/admin/teams/${r.id}`} className="card block p-4 transition hover:border-ink-600">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-ink-400">{r.code}</p>
                  <p className="truncate font-semibold">{r.name}</p>
                </div>
                <span className="font-mono text-sm font-bold tabular-nums text-ink-200">{formatDuration(r.elapsed)}</span>
              </div>
              <div className="mt-3 flex gap-1.5">
                {r.order.map((o, i) => {
                  const current = !o.done && i === r.stage && (r.status === "travel" || r.status === "solving");
                  return (
                    <span
                      key={i}
                      className="flex h-6 flex-1 items-center justify-center rounded-md border text-[10px] font-bold"
                      style={{
                        background: o.done ? o.track.color : current ? `${o.track.color}26` : "transparent",
                        borderColor: o.done || current ? o.track.color : "#222A3F",
                        color: o.done ? "#07090F" : current ? o.track.color : "#56607C",
                      }}
                      title={`${o.track.name} · Station ${o.station}`}
                    >
                      T{o.track.id}·{o.station}
                    </span>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className={`truncate rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>{labels[r.id]}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-ink-400">
                  <UserCheck className="h-3.5 w-3.5" /> {r.present}/{r.memberCount}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="py-10 text-center text-ink-500">No teams match.</p>}
    </div>
  );
}
