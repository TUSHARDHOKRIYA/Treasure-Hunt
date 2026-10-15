import bcrypt from "bcryptjs";
import { db } from "./db";
import { STATIONS } from "./config";
import { randomToken } from "./format";
import { sequenceFor, shuffle, stationFor } from "./schedule";

export const DEFAULT_TRACKS = [
  { id: 1, name: "Old Library", location: "Ground floor, east wing", color: "#FF7A66" },
  { id: 2, name: "Main Auditorium", location: "Block B entrance", color: "#2EC4B6" },
  { id: 3, name: "Central Garden", location: "Behind the canteen", color: "#A78BFA" },
  { id: 4, name: "Sports Ground", location: "Near the pavilion", color: "#F5B700" },
];

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

/** Fills every team × track × slot with simple placeholder questions (replace via CSV import). */
export async function generatePlaceholderQuestions() {
  const teams = await db.team.findMany({ orderBy: { id: "asc" } });
  const tracks = await db.track.findMany();
  const trackName = (id: number) => tracks.find((t) => t.id === id)!.name;

  await db.question.deleteMany();
  const rows: { teamId: number; trackId: number; slot: number; prompt: string; answers: string }[] = [];

  for (const team of teams) {
    const order = team.trackOrder.split(",").map(Number);
    order.forEach((trackId, stage) => {
      for (let slot = 1; slot <= 3; slot++) {
        const a = 3 + ((team.id * 7 + trackId * 11 + slot * 5) % 40);
        const b = 2 + ((team.id * 3 + trackId * 13 + slot * 17) % 30);
        const ops = [
          { p: `What is ${a} + ${b}?`, ans: `${a + b}` },
          { p: `What is ${a} × ${b % 9 + 2}?`, ans: `${a * (b % 9 + 2)}` },
          { p: `What is ${a + b} − ${b}?`, ans: `${a}` },
        ];
        const op = ops[(slot + team.id) % 3];
        rows.push({ teamId: team.id, trackId, slot, prompt: op.p, answers: op.ans });
      }
      const next = order[stage + 1];
      rows.push(
        next
          ? {
              teamId: team.id,
              trackId,
              slot: 4,
              prompt: `Riddle: your next stop goes by the name "${trackName(next)}". Type its name to unlock the path.`,
              answers: trackName(next),
            }
          : {
              teamId: team.id,
              trackId,
              slot: 4,
              prompt: 'Final question: complete the pirate saying — "_ marks the spot". (one letter)',
              answers: "X|x marks the spot",
            },
      );
    });
  }
  await db.question.createMany({ data: rows });
  return rows.length;
}
