/**
 * Event-day rehearsal: plays N teams through the whole hunt at the same time against a live site.
 *   npx tsx scripts/load-test.ts https://your-app.vercel.app [teams=30] [--phones=3] [--stop-at=final]
 * Every team logs in on several "phones" (all polling state like real phones), checks in, scans the
 * wrong arena once, scans the right QR, answers some questions wrongly, then correctly, to the end.
 * Afterwards it prints latency percentiles and errors, and resets every team it touched.
 */
import { readFileSync } from "node:fs";
import { db } from "../lib/db";
import { adminResetProgress } from "../lib/game";

const BASE = (process.argv[2] || "").replace(/\/$/, "");
const TEAMS = Number(process.argv[3] || 30);
const PHONES = Number(process.argv.find((a) => a.startsWith("--phones="))?.split("=")[1] ?? 3);
const STOP_AT = process.argv.find((a) => a.startsWith("--stop-at="))?.split("=")[1]; // "final" → stop before last arena's IEEE questions
const KEEP = process.argv.includes("--keep"); // don't reset at the end
const BURST = process.argv.includes("--burst"); // every phone presses Login at the same instant
if (!/^https?:\/\//.test(BASE)) throw new Error("usage: tsx scripts/load-test.ts <url> [teams]");

const pw = Object.fromEntries(
  readFileSync("credentials.csv", "utf8")
    .trim()
    .split("\n")
    .slice(1)
    .map((l) => l.split(",").map((x) => x.trim()))
    .map(([code, , p]) => [code, p]),
);

type Sample = { ep: string; ms: number; ok: boolean; status: number };
const samples: Sample[] = [];
const startTimes: number[] = [];
const errors: string[] = [];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let retried = 0;
let dupIgnored = 0;

/** Same behaviour as the phone app (lib/client-fetch.ts): 8 s timeout, up to 2 retries. */
async function call(ep: string, cookie: string | null, body?: unknown) {
  const t = Date.now();
  let lastErr = "";
  for (let attempt = 0; attempt <= 2; attempt++) {
    if (attempt > 0) retried++;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(BASE + ep, {
        method: body === undefined ? "GET" : "POST",
        headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.status >= 500 && attempt < 2) {
        lastErr = `HTTP ${res.status}`;
        continue;
      }
      const json = await res.json().catch(() => null);
      const ok = res.ok || (ep === "/api/auth/login" && res.status === 401);
      samples.push({ ep, ms: Date.now() - t, ok, status: res.status });
      if (!ok) errors.push(`${ep} → HTTP ${res.status} ${JSON.stringify(json)?.slice(0, 120)}`);
      return { res, json };
    } catch (e) {
      clearTimeout(timer);
      const cause = (e as { cause?: { code?: string } }).cause;
      lastErr = `${(e as Error).name === "AbortError" ? "timeout" : (e as Error).message} ${cause?.code ?? ""}`;
      await sleep(400 * (attempt + 1));
    }
  }
  samples.push({ ep, ms: Date.now() - t, ok: false, status: 0 });
  errors.push(`${ep} → failed after retries (${lastErr}) in ${Date.now() - t} ms`);
  return { res: null, json: null };
}


async function playTeam(code: string, team: Awaited<ReturnType<typeof loadTeams>>[number], tIndex: number) {
  // Staggered arrival over ~10 s like a real crowd — or everyone at once with --burst.
  if (!BURST) await sleep(Math.random() * 10_000);
  const logins = await Promise.all(
    Array.from({ length: PHONES }, () => call("/api/auth/login", null, { code, password: pw[code] })),
  );
  const phones = logins.map(({ res }) => res?.headers.get("set-cookie")?.split(";")[0]).filter((c): c is string => !!c);
  if (phones.length < PHONES) {
    errors.push(`${code}: ${PHONES - phones.length} login(s) failed`);
    if (!phones.length) return "login-failed";
  }
  const main = phones[0];

  // Teammates' phones poll in the background every 8 s, like the real app.
  let polling = true;
  const pollers = phones.slice(1).map(async (c) => {
    while (polling) {
      await sleep(8000 + Math.random() * 1000);
      if (polling) await call("/api/state", c);
    }
  });

  let s = (await call("/api/state", main)).json;
  if (s?.startedAt) startTimes.push(s.startedAt);
  await call("/api/attendance", main, { presentIds: s.members.map((m: { id: number }) => m.id), pin: process.env.ATTENDANCE_PIN || "2468" });

  let guard = 0;
  let wrongMcqDone = false;
  while (guard++ < 80) {
    s = (await call("/api/state", main)).json;
    if (!s?.phase) {
      await sleep(1000); // failed request (already recorded) — retry like a phone would
      continue;
    }
    if (s.phase === "finished") break;
    if (STOP_AT === "final" && s.stage === 3 && s.questionNo === 3) break;
    if (s.phase === "travel") {
      const a = team.assignments.find((x) => x.stage === s.stage)!;
      if (s.stage === 0) {
        const wrong = team.allQrs.find((q) => q.trackId !== a.trackId)!;
        const r = (await call("/api/scan", main, { code: wrong.token })).json;
        if (r?.result !== "WRONG_TRACK") errors.push(`${code}: wrong-arena scan gave ${r?.result}`);
      }
      const r = (await call("/api/scan", main, { code: a.qrCode.token })).json;
      if (r?.result !== "OK") errors.push(`${code}: correct scan gave ${r?.result}`);
      await sleep(1500 + Math.random() * 2000); // walking + reading
      continue;
    }
    const q = team.questions.find((x) => x.trackId === s.current.track.id && x.slot === s.questionNo)!;
    const correct = q.kind === "mcq" ? q.answers : q.answers.split("|")[0];
    // A few teams get one text question wrong; one team in five gets an MCQ wrong (45 s lock).
    if (q.kind === "text" && s.questionNo === 1 && tIndex % 3 === 0 && s.stage === 0) {
      const r = (await call("/api/answer", main, { answer: "definitely wrong", stage: s.stage, questionNo: s.questionNo })).json;
      if (r?.status !== "wrong") errors.push(`${code}: wrong text answer gave ${r?.status}`);
      await sleep((s.lockSeconds?.text ?? 5) * 1000 + 300);
    }
    if (q.kind === "mcq" && !wrongMcqDone && tIndex % 5 === 0) {
      wrongMcqDone = true;
      const bad = (JSON.parse(q.options) as string[]).find((o) => o !== q.answers)!;
      const r = (await call("/api/answer", main, { answer: bad, stage: s.stage, questionNo: s.questionNo })).json;
      if (r?.status !== "wrong") errors.push(`${code}: wrong MCQ gave ${r?.status}`);
      const blocked = (await call("/api/answer", main, { answer: q.answers, stage: s.stage, questionNo: s.questionNo })).json;
      if (blocked?.status !== "cooldown") errors.push(`${code}: MCQ lock not enforced (${blocked?.status})`);
      await sleep((s.lockSeconds?.mcq ?? 45) * 1000 + 300);
    }
    await sleep(800 + Math.random() * 1500); // thinking time
    const r = (await call("/api/answer", main, { answer: correct, stage: s.stage, questionNo: s.questionNo })).json;
    const movedOn = r?.state && (r.state.stage !== s.stage || r.state.questionNo !== s.questionNo || r.state.phase === "finished");
    if (r?.status === "stale" && movedOn) dupIgnored++; // a delayed retry of an answer that already counted
    else if (r?.status !== "correct") errors.push(`${code}: ${q.kind} answer gave ${r?.status} on T${q.trackId}Q${q.slot}`);
  }
  polling = false;
  await Promise.all(pollers);
  return s?.phase ?? "unknown";
}

async function loadTeams(codes: string[]) {
  const allQrs = await db.qrCode.findMany();
  const teams = await db.team.findMany({
    where: { code: { in: codes } },
    include: { assignments: { include: { qrCode: true } }, questions: true },
  });
  return teams.map((t) => ({ ...t, allQrs }));
}

function pct(arr: number[], p: number) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] ?? 0;
}

async function main() {
  const codes = Array.from({ length: TEAMS }, (_, i) => `TEAM${String(i + 1).padStart(2, "0")}`);
  const teams = await loadTeams(codes);
  for (const t of teams) await adminResetProgress(t.id);

  console.log(`Rehearsal: ${teams.length} teams × ${PHONES} phones against ${BASE}`);
  const started = Date.now();
  const results = await Promise.all(
    teams.map((t, i) =>
      playTeam(t.code, t, i).catch((e) => {
        errors.push(`${t.code}: crashed — ${(e as Error).message}`);
        return "crashed";
      }),
    ),
  );
  const secs = Math.round((Date.now() - started) / 1000);

  const finished = results.filter((r) => r === "finished").length;
  console.log(`\nDone in ${secs}s — finished: ${finished}/${teams.length}  (${results.filter((r) => r !== "finished").join(", ") || "all finished"})`);
  console.log(`Requests: ${samples.length}, failed (seen by players): ${samples.filter((s) => !s.ok).length}, silently retried: ${retried}, duplicate answers safely ignored: ${dupIgnored}`);
  const eps = [...new Set(samples.map((s) => s.ep))];
  console.log("\nendpoint              n     p50    p95    max");
  for (const ep of eps) {
    const ms = samples.filter((s) => s.ep === ep).map((s) => s.ms);
    console.log(`${ep.padEnd(20)} ${String(ms.length).padStart(4)} ${String(pct(ms, 50)).padStart(6)} ${String(pct(ms, 95)).padStart(6)} ${String(Math.max(...ms)).padStart(6)}  ms`);
  }
  if (startTimes.length) {
    const spread = (Math.max(...startTimes) - Math.min(...startTimes)) / 1000;
    console.log(`
Clock start: ${startTimes.length} teams, first-to-last login spread ${spread.toFixed(1)} s (each team's clock starts at its own login)`);
  }
  if (errors.length) console.log(`\nErrors (${errors.length}):\n  ` + [...new Set(errors)].slice(0, 25).join("\n  "));

  if (!KEEP) {
    for (const t of teams) await adminResetProgress(t.id);
    console.log(`\nReset ${teams.length} teams.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
