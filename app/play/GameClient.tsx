"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Footprints,
  KeyRound,
  Loader2,
  LogOut,
  MapPin,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { AnswerResponse, ScanResponse, TeamState } from "@/lib/game";
import { formatDuration } from "@/lib/format";
import { Logo } from "@/components/Logo";
import { Timer } from "@/components/Timer";
import { TrackProgress } from "@/components/TrackProgress";
import { QrScanner } from "@/components/QrScanner";
import { ScanResultView } from "@/components/ScanResultView";

type Overlay = null | { kind: "correct" } | { kind: "cleared"; finished: boolean };

export function GameClient({ initial }: { initial: TeamState }) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/state", { cache: "no-store" }).catch(() => null);
    if (res?.status === 401) return router.replace("/login");
    if (res?.ok) setState(await res.json());
  }, [router]);

  // Keep all teammates' phones in sync.
  useEffect(() => {
    const id = setInterval(refresh, 5000);
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  const onCode = useCallback(
    async (code: string) => {
      setScannerOpen(false);
      setScanBusy(true);
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      }).catch(() => null);
      const data: ScanResponse = res?.ok ? await res.json() : { result: "INVALID" };
      navigator.vibrate?.(data.result === "OK" ? 60 : [30, 50, 30]);
      setScanResult(data);
      setScanBusy(false);
      refresh();
    },
    [refresh],
  );

  async function logout() {
    if (!confirm("Sign out on this phone? Your team's clock keeps running.")) return;
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  const { phase } = state;

  return (
    <main className="bg-hunt min-h-dvh">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-ink-800/80 bg-ink-950/75 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <Logo size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{state.team.name}</p>
            <p className="font-mono text-xs text-ink-400">{state.team.code}</p>
          </div>
          <Timer startedAt={state.startedAt} finishedAt={state.finishedAt} penaltySec={state.penaltySec} serverNow={state.serverNow} />
          <button onClick={logout} className="grid h-10 w-10 place-items-center rounded-full text-ink-400 hover:bg-ink-800" aria-label="Sign out">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 pb-32 pt-5">
        <section className="card mb-5 px-4 pb-3 pt-4">
          <TrackProgress progress={state.progress} />
        </section>

        {phase === "attendance" && <AttendanceView state={state} onDone={refresh} />}
        {phase === "travel" && <TravelView state={state} onScan={() => setScannerOpen(true)} />}
        {phase === "question" && (
          <QuestionView
            key={`${state.stage}-${state.questionNo}`}
            state={state}
            onResult={(r) => {
              if (r.status === "correct") {
                navigator.vibrate?.(60);
                setOverlay(r.trackCleared ? { kind: "cleared", finished: r.finished } : { kind: "correct" });
                if (!r.trackCleared) setTimeout(() => setOverlay(null), 900);
              }
              refresh();
            }}
          />
        )}
        {phase === "finished" && <FinishedView state={state} />}
      </div>

      {/* Sticky scan button while travelling */}
      {phase === "travel" && !scanResult && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-ink-950 via-ink-950/95 to-transparent px-4 pt-8">
          <div className="mx-auto max-w-md">
            <button className="btn-primary h-16 text-lg" onClick={() => setScannerOpen(true)} disabled={scanBusy}>
              {scanBusy ? <Loader2 className="h-6 w-6 animate-spin" /> : <><ScanLine className="h-6 w-6" /> Scan QR code</>}
            </button>
          </div>
        </div>
      )}

      {scannerOpen && <QrScanner onCode={onCode} onClose={() => setScannerOpen(false)} />}

      {scanResult && (
        <Sheet onClose={() => setScanResult(null)}>
          <ScanResultView result={scanResult} />
          <div className="mt-7 grid gap-3">
            {scanResult.result === "OK" || scanResult.result === "ALREADY_IN" ? (
              <button className="btn-primary" onClick={() => setScanResult(null)}>
                Start questions <ArrowRight className="h-5 w-5" />
              </button>
            ) : (
              <>
                {phase === "travel" && (
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setScanResult(null);
                      setScannerOpen(true);
                    }}
                  >
                    <QrCode className="h-5 w-5" /> Scan again
                  </button>
                )}
                <button className="btn-ghost" onClick={() => setScanResult(null)}>
                  Close
                </button>
              </>
            )}
          </div>
        </Sheet>
      )}

      {overlay?.kind === "correct" && (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-good/10 backdrop-blur-[2px]">
          <div className="animate-pop flex flex-col items-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-good text-ink-950 shadow-[0_0_60px_rgba(52,211,153,.5)]">
              <Check className="h-12 w-12" strokeWidth={3} />
            </div>
            <p className="mt-4 text-2xl font-bold text-good">Correct!</p>
          </div>
        </div>
      )}

      {overlay?.kind === "cleared" && !overlay.finished && (
        <Sheet onClose={() => setOverlay(null)}>
          <div className="flex flex-col items-center text-center">
            <div className="animate-pop mb-5 grid h-20 w-20 place-items-center rounded-full bg-gold-400/15 text-gold-400 ring-8 ring-gold-400/20">
              <Sparkles className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold">Track cleared!</h2>
            <p className="mt-2 text-ink-300">
              The riddle is solved. {state.current ? <>Head to <b style={{ color: state.current.track.color }}>{state.current.track.name}</b>.</> : "Head to your next track."}
            </p>
          </div>
          <button className="btn-primary mt-7" onClick={() => setOverlay(null)}>
            <Footprints className="h-5 w-5" /> Let&apos;s go
          </button>
        </Sheet>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="safe-bottom animate-rise w-full max-w-md rounded-t-[2rem] border border-ink-700 bg-ink-900 px-6 pt-3 sm:rounded-[2rem] sm:pb-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-ink-700 sm:hidden" />
        {children}
      </div>
    </div>
  );
}

const AVATAR_COLORS = ["#FF7A66", "#2EC4B6", "#A78BFA"];

function AttendanceView({ state, onDone }: { state: TeamState; onDone: () => void }) {
  const [present, setPresent] = useState<number[]>([]);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (id: number) => setPresent((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presentIds: present, pin }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok) return onDone();
    setError(data?.error ?? "Network error. Try again.");
    setBusy(false);
  }

  return (
    <div className="animate-rise space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-gold-400">Step 1 · Check in</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Welcome aboard, crew</h1>
        <p className="mt-2 text-ink-300">Tap each member who is here. A volunteer will verify and enter the PIN.</p>
      </div>

      <ul className="space-y-3">
        {state.members.map((m, i) => {
          const on = present.includes(m.id);
          return (
            <li key={m.id}>
              <button
                onClick={() => toggle(m.id)}
                className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition active:scale-[.99] ${
                  on ? "border-good/50 bg-good/10" : "border-ink-700 bg-ink-900/80"
                }`}
                aria-pressed={on}
              >
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-bold text-ink-950"
                  style={{ background: AVATAR_COLORS[i % 3] }}
                >
                  {m.name
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{m.name}</span>
                  <span className="block truncate text-sm text-ink-400">
                    {[m.rollNo, m.phone].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition ${
                    on ? "border-good bg-good text-ink-950" : "border-ink-600"
                  }`}
                >
                  {on && <Check className="h-5 w-5" strokeWidth={3} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {state.pinRequired && (
        <div className="card p-4">
          <label className="label flex items-center gap-2" htmlFor="pin">
            <ShieldCheck className="h-4 w-4" /> Volunteer PIN
          </label>
          <input
            id="pin"
            className="input text-center font-mono text-2xl tracking-[.6em]"
            inputMode="numeric"
            type="password"
            maxLength={8}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      )}

      {error && <p className="animate-shake rounded-xl bg-bad/10 px-4 py-3 text-sm text-bad">{error}</p>}

      <button className="btn-primary" disabled={busy || present.length === 0 || (state.pinRequired && !pin)} onClick={submit}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Mark attendance ({present.length}/{state.members.length})</>}
      </button>
      {state.startedAt && <p className="text-center text-xs text-ink-500">Your clock is already running — check in quickly!</p>}
    </div>
  );
}

function TravelView({ state, onScan }: { state: TeamState; onScan: () => void }) {
  const cur = state.current!;
  const c = cur.track.color;
  return (
    <div className="animate-rise space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-gold-400">
          {cur.isFirst ? "Your first destination" : "Next destination"}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{cur.isFirst ? "Set sail!" : "On to the next track"}</h1>
      </div>

      <div className="relative overflow-hidden rounded-3xl border bg-ink-900" style={{ borderColor: `${c}55` }}>
        <div className="absolute inset-x-0 top-0 h-36" style={{ background: `radial-gradient(120% 100% at 0% 0%, ${c}40, transparent 70%)` }} />
        <div className="relative p-6">
          <span className="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider" style={{ background: `${c}26`, color: c }}>
            Track {state.stage + 1} of 4
          </span>
          <h2 className="mt-4 text-4xl font-bold leading-tight tracking-tight">{cur.track.name}</h2>
          <p className="mt-2 flex items-center gap-2 text-ink-300">
            <MapPin className="h-4 w-4 shrink-0" style={{ color: c }} /> {cur.track.location}
          </p>

          {cur.station && (
            <div className="mt-6 flex items-center gap-4 rounded-2xl border border-ink-700 bg-ink-950/60 p-4">
              <div
                className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl font-mono text-4xl font-bold text-ink-950"
                style={{ background: c }}
              >
                {cur.station}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">Your QR station</p>
                <p className="text-lg font-semibold">Station {cur.station}</p>
                <p className="text-sm text-ink-400">Scan only this station&apos;s QR.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ol className="card divide-y divide-ink-800 px-5">
        {[
          { Icon: Footprints, t: `Walk to ${cur.track.name}` },
          { Icon: QrCode, t: cur.station ? `Find QR station ${cur.station}` : "Find your team's QR code" },
          { Icon: ScanLine, t: "Scan it to unlock 4 questions", action: true },
        ].map(({ Icon, t, action }, i) => (
          <li key={i} className="flex items-center gap-4 py-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-800 text-ink-300">
              <Icon className="h-4 w-4" />
            </span>
            {action ? (
              <button onClick={onScan} className="text-left font-medium text-gold-300 underline-offset-4 hover:underline">
                {t}
              </button>
            ) : (
              <span className="font-medium">{t}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function QuestionView({ state, onResult }: { state: TeamState; onResult: (r: AnswerResponse) => void }) {
  const cur = state.current!;
  const q = state.question!;
  const c = cur.track.color;
  const isLastTrack = state.stage === 3;
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [wrong, setWrong] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(state.cooldownUntil);
  const [now, setNow] = useState(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!cooldownUntil) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [cooldownUntil]);
  const waitSec = cooldownUntil ? Math.ceil((cooldownUntil - now) / 1000) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim() || waitSec > 0) return;
    setBusy(true);
    const res = await fetch("/api/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    }).catch(() => null);
    const data: AnswerResponse = res?.ok ? await res.json() : { status: "stale" };
    setBusy(false);
    if (data.status === "wrong" || data.status === "cooldown") {
      setWrong((w) => w + 1);
      setCooldownUntil(data.cooldownUntil);
      setNow(Date.now());
      navigator.vibrate?.([30, 50, 30]);
      inputRef.current?.select();
    }
    onResult(data);
  }

  const kind = q.slot < 4 ? "question" : isLastTrack ? "final" : "riddle";

  return (
    <div className="animate-rise space-y-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold" style={{ background: `${c}22`, color: c }}>
          <MapPin className="h-4 w-4" /> {cur.track.name}
        </span>
        <span className="font-mono text-sm text-ink-400">Q{q.slot}/4</span>
      </div>

      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className="h-1.5 flex-1 rounded-full transition-all" style={{ background: n < q.slot ? c : n === q.slot ? `${c}99` : "#222A3F" }} />
        ))}
      </div>

      <div
        className={`relative overflow-hidden rounded-3xl border p-6 ${kind === "question" ? "border-ink-700 bg-ink-900/80" : "border-gold-400/40 bg-gradient-to-br from-gold-500/15 to-ink-900"}`}
      >
        <p className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] ${kind === "question" ? "text-ink-400" : "text-gold-400"}`}>
          {kind === "question" ? (
            <>Question {q.slot}</>
          ) : kind === "riddle" ? (
            <>
              <KeyRound className="h-4 w-4" /> The riddle · leads to your next track
            </>
          ) : (
            <>
              <Trophy className="h-4 w-4" /> Final question · stops the clock
            </>
          )}
        </p>
        <p className="mt-4 whitespace-pre-line text-xl font-medium leading-relaxed">{q.prompt}</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          ref={inputRef}
          key={wrong}
          className={`input h-16 text-xl ${wrong ? "animate-shake border-bad/60" : ""}`}
          placeholder="Type your answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          aria-label="Your answer"
        />
        {wrong > 0 && (
          <p className="text-sm text-bad" role="alert">
            Not quite. {waitSec > 0 ? `Try again in ${waitSec}s.` : "Give it another go."}
          </p>
        )}
        <button className="btn-primary h-16 text-lg" disabled={busy || !answer.trim() || waitSec > 0}>
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : waitSec > 0 ? (
            <span className="font-mono">Wait {waitSec}s</span>
          ) : (
            <>Submit answer <ArrowRight className="h-5 w-5" /></>
          )}
        </button>
      </form>
    </div>
  );
}

function FinishedView({ state }: { state: TeamState }) {
  const total = (state.finishedAt ?? 0) - (state.startedAt ?? 0) + state.penaltySec * 1000;
  const colors = ["#FFD166", "#FF7A66", "#2EC4B6", "#A78BFA", "#34D399"];
  return (
    <div className="relative">
      <div className="confetti pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
        {Array.from({ length: 36 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 37) % 100}%`,
              background: colors[i % colors.length],
              animationDuration: `${3 + (i % 5)}s`,
              animationDelay: `${(i % 7) * 0.4}s`,
            }}
          />
        ))}
      </div>
      <div className="animate-rise relative z-10 flex flex-col items-center pt-4 text-center">
        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-full bg-gold-500/40 blur-3xl" />
          <div className="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-ink-950 shadow-glow">
            <Trophy className="h-14 w-14" strokeWidth={2} />
          </div>
        </div>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[.3em] text-gold-400">Hunt complete</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Treasure found!</h1>
        <p className="mt-2 text-ink-300">All four tracks conquered, {state.team.name}.</p>

        <div className="card mt-8 w-full p-6">
          <p className="label">Final time</p>
          <p className="font-mono text-5xl font-bold tabular-nums text-gold-300">{formatDuration(total)}</p>
          {state.penaltySec > 0 && <p className="mt-2 text-xs text-ink-400">Includes {state.penaltySec}s penalty</p>}
        </div>

        <ul className="mt-5 flex w-full flex-wrap justify-center gap-2">
          {state.members.map((m) => (
            <li key={m.id} className="rounded-full border border-ink-700 bg-ink-900 px-3 py-1.5 text-sm">
              {m.name}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-ink-400">Head back to the base — results will be announced soon.</p>
      </div>
    </div>
  );
}
