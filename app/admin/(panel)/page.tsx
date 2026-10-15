import { Flag, LogIn, Navigation, PlayCircle, PauseCircle, Puzzle, Users } from "lucide-react";
import { db } from "@/lib/db";
import { loadTeams, statusLabel } from "@/lib/admin";
import { isEventOpen } from "@/lib/settings";
import { STATIONS } from "@/lib/config";
import { setEventOpen } from "../actions";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { ActionButton } from "@/components/admin/ActionButton";
import { TeamList } from "@/components/admin/TeamList";

export default async function Dashboard() {
  const [rows, tracks, open] = await Promise.all([loadTeams(), db.track.findMany({ orderBy: { id: "asc" } }), isEventOpen()]);

  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const stats = [
    { label: "Teams", value: rows.length, Icon: Users, tone: "text-ink-200" },
    { label: "Signed in", value: rows.length - count("waiting"), Icon: LogIn, tone: "text-ink-200" },
    { label: "Travelling", value: count("travel"), Icon: Navigation, tone: "text-sky-300" },
    { label: "Solving", value: count("solving"), Icon: Puzzle, tone: "text-gold-300" },
    { label: "Finished", value: count("finished"), Icon: Flag, tone: "text-good" },
  ];

  const labels = Object.fromEntries(rows.map((r) => [r.id, statusLabel(r)]));

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={5} />

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-gold-400">Live overview</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Mission control</h1>
          <p className="mt-1 text-sm text-ink-400">Updates every 5 seconds.</p>
        </div>
        <div className="md:w-60">
          {open ? (
            <ActionButton action={setEventOpen.bind(null, false)} confirmText="Close the event? New logins will be blocked." className="btn-ghost h-12">
              <PauseCircle className="h-5 w-5" /> Close logins
            </ActionButton>
          ) : (
            <ActionButton action={setEventOpen.bind(null, true)} className="btn-primary h-12">
              <PlayCircle className="h-5 w-5" /> Open event
            </ActionButton>
          )}
        </div>
      </div>

      {!open && (
        <p className="rounded-2xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          The event is closed — teams can&apos;t sign in yet. Open it when you&apos;re ready to start the clock.
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map(({ label, value, Icon, tone }) => (
          <div key={label} className="card p-4 first:col-span-2 md:first:col-span-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
              <Icon className="h-4 w-4" /> {label}
            </div>
            <p className={`mt-2 font-mono text-3xl font-bold tabular-nums ${tone}`}>{value}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Crowd at each track</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tracks.map((t) => {
            const here = rows.filter((r) => r.currentTrack?.id === t.id);
            const solving = here.filter((r) => r.status === "solving");
            const heading = here.filter((r) => r.status === "travel");
            const done = rows.filter((r) => r.order.find((o) => o.track.id === t.id)?.done).length;
            return (
              <div key={t.id} className="card overflow-hidden">
                <div className="h-1.5" style={{ background: t.color }} />
                <div className="p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-semibold">
                      <span style={{ color: t.color }}>T{t.id}</span> {t.name}
                    </p>
                    <span className="text-xs text-ink-400">{done}/{rows.length} done</span>
                  </div>
                  <div className="mt-3 flex gap-4 text-sm">
                    <span>
                      <b className="font-mono text-xl">{solving.length}</b> <span className="text-ink-400">solving</span>
                    </span>
                    <span>
                      <b className="font-mono text-xl">{heading.length}</b> <span className="text-ink-400">on the way</span>
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {STATIONS.map((s) => {
                      const n = solving.filter((r) => r.currentStation === s).length;
                      return (
                        <div key={s} className="flex items-center gap-2 text-xs">
                          <span className="w-4 font-mono font-bold text-ink-300">{s}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-800">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, n * 20)}%`, background: t.color }} />
                          </div>
                          <span className="w-4 text-right font-mono text-ink-300">{n}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Teams</h2>
        <TeamList rows={rows} labels={labels} />
      </section>
    </div>
  );
}
