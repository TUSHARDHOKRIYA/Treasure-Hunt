import bcrypt from "bcryptjs";
import { db } from "./db";
import { STATIONS } from "./config";
import { randomToken } from "./format";
import { sequenceFor, shuffle, stationFor } from "./schedule";
import { ARENAS, generateQuestionSet } from "./questions";

// The 4 arenas. Locations are left blank — add them from Admin → Setup if you want them shown.
export const DEFAULT_TRACKS = ARENAS.map((a) => ({ id: a.id, name: a.name, location: "", color: a.color }));

/** Creates the 4 tracks and their 12 QR stations if they don't exist yet. */
export async function ensureTracksAndQr() {
  for (const t of DEFAULT_TRACKS) {
    await db.track.upsert({ where: { id: t.id }, update: {}, create: t });
    for (const station of STATIONS) {
      const exists = await db.qrCode.findUnique({ where: { trackId_station: { trackId: t.id, station } } });
      if (!exists) await db.qrCode.create({ data: { trackId: t.id, station, token: randomToken() } });
    }
  }
}

export type TeamInput = {
  code: string;
  name: string;
  password: string;
  members: { name: string; rollNo: string; phone: string }[];
};

/** Wipes all teams and rebuilds them with a fresh random track schedule. */
export async function buildTeams(inputs: TeamInput[]) {
  await ensureTracksAndQr();
  const qrs = await db.qrCode.findMany();
  const qrId = (trackId: number, station: string) => qrs.find((q) => q.trackId === trackId && q.station === station)!.id;

  await db.team.deleteMany();
  const shuffled = shuffle(inputs);

  for (let k = 0; k < shuffled.length; k++) {
    const t = shuffled[k];
    const { group, order } = sequenceFor(k);
    await db.team.create({
      data: {
        code: t.code,
        name: t.name,
        passwordHash: await bcrypt.hash(t.password, 8),
        seqGroup: group,
        trackOrder: order.join(","),
        members: { create: t.members },
        assignments: {
          create: order.map((trackId, stage) => ({ trackId, stage, qrCodeId: qrId(trackId, stationFor(k, trackId)) })),
        },
      },
    });
  }
}

/** Generates a fresh, unique, arena-themed question set for every team (replaces all questions). */
export async function generateQuestions(seed = Date.now() % 100000) {
  const teams = await db.team.findMany({ orderBy: { id: "asc" }, select: { id: true, trackOrder: true } });
  const rows = generateQuestionSet(
    teams.map((t) => ({ id: t.id, order: t.trackOrder.split(",").map(Number) })),
    seed,
  ).map((q) => ({
    teamId: q.teamId,
    trackId: q.trackId,
    slot: q.slot,
    prompt: q.prompt,
    answers: q.answers,
    kind: q.kind,
    options: q.options ? JSON.stringify(q.options) : "",
    category: q.category ?? "",
    takeaway: q.takeaway ?? "",
  }));
  await db.$transaction([db.question.deleteMany(), db.question.createMany({ data: rows })]);
  return rows.length;
}

/** Renames the tracks to the default arenas (keeps any locations already set). */
export async function applyArenaNames() {
  for (const t of DEFAULT_TRACKS) {
    await db.track.upsert({ where: { id: t.id }, update: { name: t.name, color: t.color }, create: t });
  }
}
