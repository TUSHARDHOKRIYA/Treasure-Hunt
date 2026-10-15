import { db } from "./db";
import { config } from "./config";
import { isCorrect } from "./normalize";
import { parseOrder } from "./schedule";

export type Phase = "attendance" | "travel" | "question" | "finished";

export type TrackInfo = { id: number; name: string; location: string; color: string };

export type TeamState = {
  team: { id: number; code: string; name: string };
  members: { id: number; name: string; rollNo: string; phone: string; present: boolean }[];
  phase: Phase;
  serverNow: number;
  startedAt: number | null;
  finishedAt: number | null;
  penaltySec: number;
  stage: number;
  questionNo: number;
  progress: { stage: number; status: "done" | "current" | "locked"; track: TrackInfo | null }[];
  current: { track: TrackInfo; station: string | null; isFirst: boolean } | null;
  question: { slot: number; prompt: string } | null;
  cooldownUntil: number | null;
  pinRequired: boolean;
};

const toInfo = (t: { id: number; name: string; location: string; color: string }): TrackInfo => ({
  id: t.id,
  name: t.name,
  location: t.location,
  color: t.color,
});

export async function getTeamState(teamId: number): Promise<TeamState | null> {
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: {
      members: { orderBy: { id: "asc" } },
      assignments: { include: { track: true, qrCode: true }, orderBy: { stage: "asc" } },
    },
  });
  if (!team) return null;

  const phase: Phase = team.finishedAt
    ? "finished"
    : !team.attendanceAt
      ? "attendance"
      : team.questionNo === 0
        ? "travel"
        : "question";

  // Tracks are revealed only once the team has reached them (future ones stay hidden).
  const progress = team.assignments.map((a) => {
    const status: "done" | "current" | "locked" = a.completedAt
      ? "done"
      : a.stage === team.stage && phase !== "attendance"
        ? "current"
        : "locked";
    return { stage: a.stage, status, track: status === "locked" ? null : toInfo(a.track) };
  });

  const curA = team.assignments.find((a) => a.stage === team.stage);
  const current =
    curA && (phase === "travel" || phase === "question")
      ? { track: toInfo(curA.track), station: config.showStation ? curA.qrCode.station : null, isFirst: team.stage === 0 }
      : null;

  let question: TeamState["question"] = null;
  if (phase === "question" && curA) {
    const q = await db.question.findUnique({
      where: { teamId_trackId_slot: { teamId, trackId: curA.trackId, slot: team.questionNo } },
    });
    question = { slot: team.questionNo, prompt: q?.prompt ?? "Question missing — please call an organiser." };
  }

  const cooldownUntil =
    team.lastWrongAt && config.wrongCooldownSec > 0
      ? team.lastWrongAt.getTime() + config.wrongCooldownSec * 1000
      : null;

  return {
    team: { id: team.id, code: team.code, name: team.name },
    members: team.members.map((m) => ({ id: m.id, name: m.name, rollNo: m.rollNo, phone: m.phone, present: m.present })),
    phase,
    serverNow: Date.now(),
    startedAt: team.startedAt?.getTime() ?? null,
    finishedAt: team.finishedAt?.getTime() ?? null,
    penaltySec: team.penaltySec,
    stage: team.stage,
    questionNo: team.questionNo,
    progress,
    current,
    question,
    cooldownUntil: cooldownUntil && cooldownUntil > Date.now() ? cooldownUntil : null,
    pinRequired: !!config.attendancePin,
  };
}

export async function markAttendance(teamId: number, presentIds: number[], pin: string) {
  if (config.attendancePin && pin.trim() !== config.attendancePin) {
    return { ok: false as const, error: "Wrong volunteer PIN. Ask the volunteer at the desk." };
  }
  if (presentIds.length === 0) return { ok: false as const, error: "Mark at least one member present." };

  const team = await db.team.findUnique({ where: { id: teamId }, include: { members: true } });
  if (!team) return { ok: false as const, error: "Team not found." };
  if (team.attendanceAt) return { ok: true as const };

  const now = new Date();
  await db.$transaction([
    ...team.members.map((m) =>
      db.member.update({
        where: { id: m.id },
        data: { present: presentIds.includes(m.id), markedAt: presentIds.includes(m.id) ? now : null },
      }),
    ),
    db.team.update({
      where: { id: teamId },
      data: { attendanceAt: now, startedAt: team.startedAt ?? now },
    }),
  ]);
  return { ok: true as const };
}

export type ScanResult =
  | "OK"
  | "ALREADY_IN"
  | "WRONG_TRACK"
  | "WRONG_QR"
  | "TRACK_DONE"
  | "BUSY"
  | "NEED_ATTENDANCE"
  | "FINISHED"
  | "INVALID";

export type ScanResponse = {
  result: ScanResult;
  scannedTrack?: { name: string; color: string };
  scannedStation?: string;
  correctStation?: string | null;
};

export function extractToken(raw: string): string {
  const s = raw.trim().toLowerCase();
  const m = s.match(/\/s\/([a-z0-9]+)/);
  if (m) return m[1];
  return /^[a-z0-9]+$/.test(s) ? s : "";
}

export async function scanQr(teamId: number, rawToken: string): Promise<ScanResponse> {
  const token = extractToken(rawToken);
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: { assignments: { include: { qrCode: true } } },
  });
  if (!team) return { result: "INVALID" };

  const qr = token ? await db.qrCode.findUnique({ where: { token }, include: { track: true } }) : null;
  const log = async (result: ScanResult) => {
    await db.scan.create({ data: { teamId, qrCodeId: qr?.id ?? null, result } });
    return result;
  };

  if (!qr) return { result: await log("INVALID") };
  if (team.finishedAt) return { result: await log("FINISHED") };
  if (!team.attendanceAt) return { result: await log("NEED_ATTENDANCE") };

  const expected = team.assignments.find((a) => a.stage === team.stage)!;
  const scannedTrack = { name: qr.track.name, color: qr.track.color };

  if (team.questionNo > 0) {
    if (qr.id === expected.qrCodeId) return { result: await log("ALREADY_IN"), scannedTrack };
    return { result: await log("BUSY"), scannedTrack };
  }

  if (qr.trackId !== expected.trackId) {
    const done = team.assignments.find((a) => a.trackId === qr.trackId)?.completedAt;
    return { result: await log(done ? "TRACK_DONE" : "WRONG_TRACK"), scannedTrack };
  }

  if (qr.id !== expected.qrCodeId) {
    return {
      result: await log("WRONG_QR"),
      scannedTrack,
      scannedStation: qr.station,
      correctStation: config.showStation ? expected.qrCode.station : null,
    };
  }

  // Correct track + correct station → unlock Q1. Guarded so 3 phones scanning together only advance once.
  await db.$transaction([
    db.team.updateMany({ where: { id: teamId, stage: team.stage, questionNo: 0 }, data: { questionNo: 1 } }),
    db.teamTrack.updateMany({ where: { id: expected.id, enteredAt: null }, data: { enteredAt: new Date() } }),
  ]);
  return { result: await log("OK"), scannedTrack };
}

/** Move the team past its current question (guarded against double-submits). */
async function advance(team: { id: number; stage: number; questionNo: number; trackOrder: string }) {
  const now = new Date();
  if (team.questionNo < 4) {
    const r = await db.team.updateMany({
      where: { id: team.id, stage: team.stage, questionNo: team.questionNo },
      data: { questionNo: team.questionNo + 1, lastWrongAt: null },
    });
    return { advanced: r.count > 0, trackCleared: false, finished: false };
  }
  const order = parseOrder(team.trackOrder);
  const nextStage = team.stage + 1;
  const finished = nextStage >= order.length;
  const r = await db.team.updateMany({
    where: { id: team.id, stage: team.stage, questionNo: 4 },
    data: { stage: nextStage, questionNo: 0, lastWrongAt: null, ...(finished ? { finishedAt: now } : {}) },
  });
  if (r.count > 0) {
    await db.teamTrack.updateMany({
      where: { teamId: team.id, stage: team.stage, completedAt: null },
      data: { completedAt: now },
    });
  }
  return { advanced: r.count > 0, trackCleared: true, finished };
}

export type AnswerResponse =
  | { status: "correct"; trackCleared: boolean; finished: boolean }
  | { status: "wrong"; cooldownUntil: number | null }
  | { status: "cooldown"; cooldownUntil: number }
  | { status: "stale" };

export async function submitAnswer(teamId: number, answer: string): Promise<AnswerResponse> {
  const team = await db.team.findUnique({ where: { id: teamId } });
  if (!team || team.finishedAt || team.questionNo === 0) return { status: "stale" };

  if (team.lastWrongAt && config.wrongCooldownSec > 0) {
    const until = team.lastWrongAt.getTime() + config.wrongCooldownSec * 1000;
    if (until > Date.now()) return { status: "cooldown", cooldownUntil: until };
  }

  const trackId = parseOrder(team.trackOrder)[team.stage];
  const q = await db.question.findUnique({
    where: { teamId_trackId_slot: { teamId, trackId, slot: team.questionNo } },
  });
  if (!q) return { status: "stale" };

  const correct = isCorrect(answer, q.answers);
  await db.attempt.create({ data: { teamId, questionId: q.id, answer: answer.slice(0, 200), correct } });

  if (!correct) {
    const now = new Date();
    await db.team.update({ where: { id: teamId }, data: { lastWrongAt: now } });
    return { status: "wrong", cooldownUntil: config.wrongCooldownSec > 0 ? now.getTime() + config.wrongCooldownSec * 1000 : null };
  }

  const r = await advance(team);
  if (!r.advanced) return { status: "stale" };
  return { status: "correct", trackCleared: r.trackCleared, finished: r.finished };
}

/* ---------- admin operations ---------- */

export async function adminSkipQuestion(teamId: number) {
  const team = await db.team.findUnique({ where: { id: teamId } });
  if (!team || team.finishedAt || !team.attendanceAt) return;
  if (team.questionNo === 0) {
    // Let them into the current track without scanning.
    await db.team.update({ where: { id: teamId }, data: { questionNo: 1 } });
    await db.teamTrack.updateMany({ where: { teamId, stage: team.stage, enteredAt: null }, data: { enteredAt: new Date() } });
    return;
  }
  await advance(team);
}

export async function adminResetProgress(teamId: number) {
  await db.$transaction([
    db.team.update({
      where: { id: teamId },
      data: { startedAt: null, attendanceAt: null, finishedAt: null, stage: 0, questionNo: 0, penaltySec: 0, lastWrongAt: null },
    }),
    db.member.updateMany({ where: { teamId }, data: { present: false, markedAt: null } }),
    db.teamTrack.updateMany({ where: { teamId }, data: { enteredAt: null, completedAt: null } }),
    db.attempt.deleteMany({ where: { teamId } }),
    db.scan.deleteMany({ where: { teamId } }),
  ]);
}

export function elapsedMs(t: { startedAt: Date | null; finishedAt: Date | null; penaltySec: number }, now = Date.now()) {
  if (!t.startedAt) return 0;
  return (t.finishedAt?.getTime() ?? now) - t.startedAt.getTime() + t.penaltySec * 1000;
}
