import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, CheckCircle2, Clock, FastForward, MapPin, Minus, Plus, RotateCcw, UserCheck, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { elapsedMs } from "@/lib/game";
import { formatDuration } from "@/lib/format";
import { parseOrder } from "@/lib/schedule";
import { addPenalty, forceAttendance, resetTeam, skipQuestion, toggleMember } from "../../../actions";
import { ActionButton } from "@/components/admin/ActionButton";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { ResetPasswordButton } from "@/components/admin/ResetPasswordButton";

const SCAN_TEXT: Record<string, string> = {
  OK: "Scanned correct QR",
  ALREADY_IN: "Re-scanned current QR",
  WRONG_TRACK: "Scanned wrong track",
  WRONG_QR: "Right track, wrong QR",
  TRACK_DONE: "Scanned completed track",
  BUSY: "Scanned while solving",
  NEED_ATTENDANCE: "Scanned before check-in",
  FINISHED: "Scanned after finishing",
  INVALID: "Invalid QR",
};

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const team = await db.team.findUnique({
    where: { id },
    include: {
      members: { orderBy: { id: "asc" } },
      assignments: { include: { track: true, qrCode: true }, orderBy: { stage: "asc" } },
      questions: true,
      attempts: { orderBy: { createdAt: "desc" }, take: 40, include: { question: true } },
      scans: { orderBy: { createdAt: "desc" }, take: 40, include: { qrCode: { include: { track: true } } } },
    },
  });
  if (!team) notFound();

  const order = parseOrder(team.trackOrder);
  const log = [
    ...team.attempts.map((a) => ({
      at: a.createdAt,
      ok: a.correct,
      text: `T${a.question.trackId} Q${a.question.slot}: “${a.answer}”`,
    })),
    ...team.scans.map((s) => ({
      at: s.createdAt,
      ok: s.result === "OK",
      text: `${SCAN_TEXT[s.result] ?? s.result}${s.qrCode ? ` (T${s.qrCode.trackId}·${s.qrCode.station})` : ""}`,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 40);

  const status = team.finishedAt
    ? "Finished"
    : !team.attendanceAt
      ? team.startedAt
        ? "Checking in"
        : "Not logged in"
      : team.questionNo === 0
        ? `Heading to track ${order[team.stage]}`
        : `Track ${order[team.stage]} · Q${team.questionNo}`;

  return (
    <div className="space-y-6">
      <AutoRefresh seconds={5} />
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-ink-200">
        <ArrowLeft className="h-4 w-4" /> All teams
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-sm text-gold-400">{team.code} · Group {team.seqGroup + 1}</p>
          <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
          <p className="mt-1 text-ink-300">{status}</p>
        </div>
        <div className="card flex items-center gap-3 px-5 py-3">
          <Clock className="h-5 w-5 text-gold-400" />
          <span className="font-mono text-3xl font-bold tabular-nums">{formatDuration(elapsedMs(team))}</span>
          {team.penaltySec > 0 && <span className="text-xs text-bad">+{team.penaltySec}s</span>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Route</h2>
            <ol className="grid gap-3 sm:grid-cols-4">
              {team.assignments.map((a) => {
                const current = a.stage === team.stage && !team.finishedAt;
                return (
                  <li
                    key={a.id}
                    className="rounded-2xl border p-3"
                    style={{ borderColor: a.completedAt || current ? a.track.color : "#222A3F", background: current ? `${a.track.color}14` : undefined }}
                  >
                    <div className="flex items-center justify-between text-xs text-ink-400">
                      <span>Stop {a.stage + 1}</span>
                      {a.completedAt && <CheckCircle2 className="h-4 w-4" style={{ color: a.track.color }} />}
                    </div>
                    <p className="mt-1 font-semibold" style={{ color: a.track.color }}>
                      T{a.track.id} {a.track.name}
                    </p>
                    <p className="text-sm text-ink-300">Station {a.qrCode.station}</p>
                    <p className="mt-2 text-xs text-ink-500">
                      {a.completedAt
                        ? `Done ${a.completedAt.toLocaleTimeString()}`
                        : a.enteredAt
                          ? `In since ${a.enteredAt.toLocaleTimeString()}`
                          : "—"}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Questions</h2>
            <div className="space-y-5">
              {order.map((trackId, stage) => (
                <div key={trackId}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                    Stop {stage + 1} · Track {trackId}
                  </p>
                  <ul className="space-y-2">
                    {[1, 2, 3, 4].map((slot) => {
                      const q = team.questions.find((x) => x.trackId === trackId && x.slot === slot);
                      const solved = team.finishedAt || stage < team.stage || (stage === team.stage && slot < team.questionNo);
                      const current = stage === team.stage && slot === team.questionNo && !team.finishedAt;
                      return (
                        <li
                          key={slot}
                          className={`flex gap-3 rounded-xl border p-3 text-sm ${current ? "border-gold-400/50 bg-gold-400/5" : "border-ink-800"}`}
                        >
                          <span
                            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                              solved ? "bg-good text-ink-950" : current ? "bg-gold-400 text-ink-950" : "bg-ink-800 text-ink-400"
                            }`}
                          >
                            {solved ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : slot}
                          </span>
                          <div className="min-w-0">
                            <p className="text-ink-100">{q?.prompt ?? <i className="text-bad">Missing question</i>}</p>
                            <p className="mt-1 font-mono text-xs text-ink-400">→ {q?.answers.split("|").join("  /  ")}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Controls</h2>
            <div className="grid gap-2">
              {!team.attendanceAt && (
                <ActionButton action={forceAttendance.bind(null, id)} className="btn-ghost h-11 text-sm">
                  <UserCheck className="h-4 w-4" /> Check in team (skip PIN)
                </ActionButton>
              )}
              {team.attendanceAt && !team.finishedAt && (
                <ActionButton
                  action={skipQuestion.bind(null, id)}
                  confirmText={team.questionNo === 0 ? "Let the team into their current track without scanning?" : `Mark Q${team.questionNo} as solved?`}
                  className="btn-ghost h-11 text-sm"
                >
                  <FastForward className="h-4 w-4" /> {team.questionNo === 0 ? "Unlock track (skip scan)" : `Skip Q${team.questionNo}`}
                </ActionButton>
              )}
              <div className="grid grid-cols-2 gap-2">
                <ActionButton action={addPenalty.bind(null, id, 60)} className="btn-ghost h-11 text-sm">
                  <Plus className="h-4 w-4" /> 1 min
                </ActionButton>
                <ActionButton action={addPenalty.bind(null, id, -60)} className="btn-ghost h-11 text-sm">
                  <Minus className="h-4 w-4" /> 1 min
                </ActionButton>
              </div>
              <ResetPasswordButton teamId={id} />
              <ActionButton
                action={resetTeam.bind(null, id)}
                confirmText={`Reset ALL progress for ${team.name}? Their clock, attendance and answers will be wiped.`}
                className="btn h-11 border border-bad/40 bg-bad/10 text-sm text-bad"
              >
                <RotateCcw className="h-4 w-4" /> Reset progress
              </ActionButton>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Members</h2>
            <ul className="space-y-2">
              {team.members.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{m.name}</p>
                    <p className="truncate text-xs text-ink-400">{[m.rollNo, m.phone].filter(Boolean).join(" · ")}</p>
                  </div>
                  <ActionButton
                    action={toggleMember.bind(null, m.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${m.present ? "bg-good/15 text-good" : "bg-ink-800 text-ink-400"}`}
                  >
                    {m.present ? "Present" : "Absent"}
                  </ActionButton>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="mb-4 font-semibold">Activity</h2>
            {log.length === 0 && <p className="text-sm text-ink-500">Nothing yet.</p>}
            <ul className="space-y-2.5">
              {log.map((l, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  {l.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-good" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bad" />}
                  <span className="min-w-0 flex-1 break-words text-ink-200">{l.text}</span>
                  <span className="shrink-0 font-mono text-xs text-ink-500">{l.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-ink-500">
        <MapPin className="h-3.5 w-3.5" /> Route generated from the balanced schedule (group {team.seqGroup + 1}).
      </p>
    </div>
  );
}
