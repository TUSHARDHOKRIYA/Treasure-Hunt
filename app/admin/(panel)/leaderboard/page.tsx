import { Medal } from "lucide-react";
import { loadTeams, statusLabel } from "@/lib/admin";
import { formatDuration } from "@/lib/format";
import { AutoRefresh } from "@/components/admin/AutoRefresh";

const MEDALS = ["#FFD166", "#C9D1E3", "#E0915A"];

export default async function Leaderboard() {
  const rows = await loadTeams();
  // Finished teams by time; everyone else by progress, then time.
  const ranked = [...rows].sort((a, b) => {
    if (a.status === "finished" && b.status === "finished") return a.elapsed - b.elapsed;
    if (a.status === "finished") return -1;
    if (b.status === "finished") return 1;
    return b.solved - a.solved || a.elapsed - b.elapsed;
  });

  return (
    <div>
      <AutoRefresh seconds={5} />
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-gold-400">Standings</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Leaderboard</h1>
      <p className="mt-1 text-sm text-ink-400">Finished teams rank by total time (penalties included). Others by questions solved.</p>

      <ol className="mt-6 space-y-2">
        {ranked.map((r, i) => {
          const podium = r.status === "finished" && i < 3;
          return (
            <li
              key={r.id}
              className={`card flex items-center gap-4 p-4 ${podium ? "border-gold-400/40" : ""}`}
              style={podium ? { background: `linear-gradient(90deg, ${MEDALS[i]}1f, transparent 60%)` } : undefined}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-800 font-mono text-lg font-bold" style={podium ? { background: MEDALS[i], color: "#07090F" } : undefined}>
                {podium ? <Medal className="h-5 w-5" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.name}</p>
                <p className="truncate text-xs text-ink-400">
                  {r.code} · {statusLabel(r)}
                </p>
              </div>
              <div className="hidden w-32 sm:block">
                <div className="h-2 overflow-hidden rounded-full bg-ink-800">
                  <div className="h-full rounded-full bg-gold-400" style={{ width: `${(r.solved / 16) * 100}%` }} />
                </div>
                <p className="mt-1 text-right text-xs text-ink-500">{r.solved}/16</p>
              </div>
              <span className={`font-mono text-lg font-bold tabular-nums ${r.status === "finished" ? "text-good" : "text-ink-300"}`}>
                {formatDuration(r.elapsed)}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
