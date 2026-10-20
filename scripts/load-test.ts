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
const errors: string[] = [];

async function call(ep: string, cookie: string | null, body?: unknown) {
  const t = Date.now();
  let status = 0;
  try {
    const res = await fetch(BASE + ep, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    status = res.status;
    const json = await res.json().catch(() => null);
    const ok = res.ok || (ep === "/api/auth/login" && res.status === 401);
    samples.push({ ep, ms: Date.now() - t, ok, status });
    if (!ok) errors.push(`${ep} → HTTP ${res.status} ${JSON.stringify(json)?.slice(0, 120)}`);
    return { res, json };
  } catch (e) {
    samples.push({ ep, ms: Date.now() - t, ok: false, status });
    errors.push(`${ep} → ${(e as Error).message}`);
    return { res: null, json: null };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function playTeam(code: string, team: Awaited<ReturnType<typeof loadTeams>>[number], tIndex: number) {
  // Staggered arrival over ~10 s, like a real crowd.
  await sleep(Math.random() * 10_000);
  const phones: string[] = [];
  for (let p = 0; p < PHONES; p++) {
    const { res } = await call("/api/auth/login", null, { code, password: pw[code] });
    const c = res?.headers.get("set-cookie")?.split(";")[0];
    if (!c) {
      errors.push(`${code}: login failed`);
      return "login-failed";
    }
    phones.push(c);
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
  await call("/api/attendance", main, { presentIds: s.members.map((m: { id: number }) => m.id), pin: process.env.ATTENDANCE_PIN || "2468" });

  let guard = 0;
  let wrongMcqDone = false;
  while (guard++ < 80) {
    s = (await call("/api/state", main)).json;
    if (!s || s.phase === "finished") break;
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
      const r = (await call("/api/answer", main, { answer: "definitely wrong" })).json;
      if (r?.status !== "wrong") errors.push(`${code}: wrong text answer gave ${r?.status}`);
      await sleep((s.lockSeconds?.text ?? 5) * 1000 + 300);
    }
    if (q.kind === "mcq" && !wrongMcqDone && tIndex % 5 === 0) {
      wrongMcqDone = true;
      const bad = (JSON.parse(q.options) as string[]).find((o) => o !== q.answers)!;
      const r = (await call("/api/answer", main, { answer: bad })).json;
      if (r?.status !== "wrong") errors.push(`${code}: wrong MCQ gave ${r?.status}`);
      const blocked = (await call("/api/answer", main, { answer: q.answers })).json;
      if (blocked?.status !== "cooldown") errors.push(`${code}: MCQ lock not enforced (${blocked?.status})`);
      await sleep((s.lockSeconds?.mcq ?? 45) * 1000 + 300);
    }
    await sleep(800 + Math.random() * 1500); // thinking time
    const r = (await call("/api/answer", main, { answer: correct })).json;
    if (r?.status !== "correct") errors.push(`${code}: ${q.kind} answer gave ${r?.status} on T${q.trackId}Q${q.slot}`);
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
  const results = await Promise.all(teams.map((t, i) => playTeam(t.code, t, i)));
  const secs = Math.round((Date.now() - started) / 1000);

  const finished = results.filter((r) => r === "finished").length;
  console.log(`\nDone in ${secs}s — finished: ${finished}/${teams.length}  (${results.filter((r) => r !== "finished").join(", ") || "all finished"})`);
  console.log(`Requests: ${samples.length}, failed: ${samples.filter((s) => !s.ok).length}`);
  const eps = [...new Set(samples.map((s) => s.ep))];
  console.log("\nendpoint              n     p50    p95    max");
  for (const ep of eps) {
    const ms = samples.filter((s) => s.ep === ep).map((s) => s.ms);
    console.log(`${ep.padEnd(20)} ${String(ms.length).padStart(4)} ${String(pct(ms, 50)).padStart(6)} ${String(pct(ms, 95)).padStart(6)} ${String(Math.max(...ms)).padStart(6)}  ms`);
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
