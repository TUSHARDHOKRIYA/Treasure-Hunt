import { Clock, Download, FileSpreadsheet, QrCode, RefreshCcw, RotateCcw, Save } from "lucide-react";
import { db } from "@/lib/db";
import { getTimerStart } from "@/lib/settings";
import { SEQUENCES } from "@/lib/schedule";
import { importQuestions, importTeams, regeneratePlaceholders, regenerateQrCodes, resetAllProgress, setTimerStart, updateTrack } from "../../actions";
import { ActionButton } from "@/components/admin/ActionButton";
import { ImportForm } from "@/components/admin/ImportForm";

export default async function SetupPage() {
  const [tracks, teamCount, qCount, timerStart] = await Promise.all([
    db.track.findMany({ orderBy: { id: "asc" } }),
    db.team.count(),
    db.question.count(),
    getTimerStart(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-gold-400">Before the event</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Setup</h1>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { k: "Teams", v: teamCount },
          { k: "Questions", v: `${qCount} / ${teamCount * 16}` },
          { k: "Timer starts at", v: timerStart === "login" ? "Login" : "Attendance" },
        ].map((s) => (
          <div key={s.k} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{s.k}</p>
            <p className="mt-1 font-mono text-2xl font-bold">{s.v}</p>
          </div>
        ))}
      </section>

      <section className="card p-5">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gold-400" />
          <h2 className="font-semibold">When does a team&apos;s clock start?</h2>
        </div>
        <p className="mt-1 text-sm text-ink-400">
          &ldquo;At attendance&rdquo; lets you sign every device in before the event — the clock starts only when a volunteer enters the PIN for that team.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(["attendance", "login"] as const).map((mode) => (
            <ActionButton
              key={mode}
              action={setTimerStart.bind(null, mode)}
              className={`btn h-12 border text-sm ${
                timerStart === mode ? "border-gold-400 bg-gold-400/10 text-gold-300" : "border-ink-600 bg-ink-850 text-ink-300"
              }`}
            >
              {mode === "attendance" ? "At attendance (PIN)" : "At login"} {timerStart === mode && "✓"}
            </ActionButton>
          ))}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold">Tracks</h2>
        <p className="mt-1 text-sm text-ink-400">Names and locations appear on team phones and QR posters.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {tracks.map((t) => (
            <form key={t.id} action={updateTrack} className="rounded-2xl border border-ink-700 p-4">
              <input type="hidden" name="id" value={t.id} />
              <div className="flex items-center gap-3">
                <input type="color" name="color" defaultValue={t.color} className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-ink-600 bg-transparent" aria-label="Track colour" />
                <input name="name" defaultValue={t.name} className="input h-11 text-base" aria-label={`Track ${t.id} name`} />
              </div>
              <div className="mt-2 flex gap-2">
                <input name="location" defaultValue={t.location} placeholder="Location hint" className="input h-11 text-base" aria-label={`Track ${t.id} location`} />
                <button className="grid h-11 w-12 shrink-0 place-items-center rounded-2xl bg-ink-800 text-ink-200 hover:bg-ink-700" aria-label="Save track">
                  <Save className="h-4 w-4" />
                </button>
              </div>
            </form>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-gold-400" />
            <h2 className="font-semibold">1 · Import teams</h2>
          </div>
          <p className="mt-2 text-sm text-ink-400">
            One row per member: <code className="text-ink-200">team_code, team_name, password, member_name, roll_no, phone</code>. Blank passwords are generated. This
            <b className="text-bad"> replaces all teams</b> and draws a fresh balanced schedule.
          </p>
          <a href="/templates/teams.csv" download className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-gold-300">
            <Download className="h-4 w-4" /> teams.csv template
          </a>
          <div className="mt-4">
            <ImportForm action={importTeams} button="Import teams" confirmText="Replace ALL teams, progress and questions with this file?" />
          </div>
        </section>

        <section className="card p-5">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-gold-400" />
            <h2 className="font-semibold">2 · Import questions</h2>
          </div>
          <p className="mt-2 text-sm text-ink-400">
            <code className="text-ink-200">team_code, track, slot, question, answers</code>. Separate accepted answers with <code className="text-ink-200">|</code>. Slot 4 is the riddle
            for the team&apos;s next track (or the final question on its last track).
          </p>
          <a href="/admin/export/questions" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-gold-300">
            <Download className="h-4 w-4" /> Download pre-filled sheet ({teamCount * 16} rows, with each team&apos;s next track)
          </a>
          <div className="mt-4">
            <ImportForm action={importQuestions} button="Import questions" />
          </div>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold">Balanced schedule</h2>
        <p className="mt-1 text-sm text-ink-400">
          Teams are shuffled and dealt into these 4 routes. At every stage each track hosts exactly one group, and every track-to-track walk is used once.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {SEQUENCES.map((seq, g) => (
            <div key={g} className="flex items-center gap-3 rounded-xl border border-ink-800 px-3 py-2">
              <span className="text-xs font-semibold text-ink-400">Group {g + 1}</span>
              <div className="flex items-center gap-1.5">
                {seq.map((id, i) => {
                  const t = tracks.find((x) => x.id === id);
                  return (
                    <span key={i} className="flex items-center gap-1.5">
                      <span className="grid h-7 w-7 place-items-center rounded-lg font-mono text-sm font-bold text-ink-950" style={{ background: t?.color }}>
                        {id}
                      </span>
                      {i < 3 && <span className="text-ink-600">→</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card border-bad/30 p-5">
        <h2 className="font-semibold text-bad">Danger zone</h2>
        <p className="mt-1 text-sm text-ink-400">
          Regenerate QR codes once before the event (after testing) so test codes can&apos;t be reused, then print the posters.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <ActionButton
            action={regenerateQrCodes}
            confirmText="Give all 12 QR stations NEW codes? Every printed or downloaded QR stops working — reprint the posters from the QR codes page afterwards. Team routes and stations stay the same."
            className="btn h-12 border border-warn/40 bg-warn/10 text-sm text-warn"
          >
            <QrCode className="h-4 w-4" /> Regenerate QR codes
          </ActionButton>
          <ActionButton
            action={regeneratePlaceholders}
            confirmText="Replace ALL questions with a fresh, unique arena question set? Teams mid-game will see new questions."
            className="btn h-12 border border-ink-600 bg-ink-850 text-sm"
          >
            <RefreshCcw className="h-4 w-4" /> Regenerate all questions
          </ActionButton>
          <ActionButton
            action={resetAllProgress}
            confirmText="Reset progress for EVERY team (clocks, attendance, answers)? Use after a dry run."
            className="btn h-12 border border-bad/40 bg-bad/10 text-sm text-bad"
          >
            <RotateCcw className="h-4 w-4" /> Reset all team progress
          </ActionButton>
        </div>
      </section>
    </div>
  );
}
