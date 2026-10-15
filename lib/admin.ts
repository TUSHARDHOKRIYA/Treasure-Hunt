import { db } from "./db";
import { elapsedMs } from "./game";
import { parseOrder } from "./schedule";

export type TeamRow = Awaited<ReturnType<typeof loadTeams>>[number];

export async function loadTeams() {
  const [teams, tracks] = await Promise.all([
    db.team.findMany({
      orderBy: { code: "asc" },
      include: { members: true, assignments: { include: { qrCode: true } } },
    }),
    db.track.findMany({ orderBy: { id: "asc" } }),
  ]);
  const now = Date.now();
  return teams.map((t) => {
    const order = parseOrder(t.trackOrder);
    const status = t.finishedAt
      ? ("finished" as const)
      : !t.startedAt && !t.attendanceAt
        ? ("waiting" as const)
        : !t.attendanceAt
          ? ("checkin" as const)
          : t.questionNo === 0
            ? ("travel" as const)
            : ("solving" as const);
    const currentTrack = status === "travel" || status === "solving" ? tracks.find((x) => x.id === order[t.stage]) ?? null : null;
    const currentStation = currentTrack ? t.assignments.find((a) => a.trackId === currentTrack.id)?.qrCode.station ?? null : null;
    return {
      id: t.id,
      code: t.code,
      name: t.name,
      status,
      stage: t.stage,
      questionNo: t.questionNo,
      order: order.map((id) => {
        const a = t.assignments.find((x) => x.trackId === id);
        return { track: tracks.find((x) => x.id === id)!, station: a?.qrCode.station ?? "?", done: !!a?.completedAt };
      }),
      currentTrack,
      currentStation,
      present: t.members.filter((m) => m.present).length,
      memberCount: t.members.length,
      elapsed: elapsedMs(t, now),
      penaltySec: t.penaltySec,
      solved: t.finishedAt ? 16 : t.stage * 4 + Math.max(0, t.questionNo - 1),
    };
  });
}

export function statusLabel(r: TeamRow) {
  switch (r.status) {
    case "finished":
      return "Finished";
    case "waiting":
      return "Not logged in";
    case "checkin":
      return "Checking in";
    case "travel":
      return `Heading to ${r.currentTrack?.name}`;
    case "solving":
      return `${r.currentTrack?.name} · Q${r.questionNo}`;
  }
}
