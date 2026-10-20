/**
 * Renames the tracks to the 4 arenas, generates a fresh unique question set for every team,
 * resets all team progress and opens the event.
 *   npx tsx scripts/setup-arenas.ts
 */
import { db } from "../lib/db";
import { adminResetProgress } from "../lib/game";
import { setSetting } from "../lib/settings";
import { applyArenaNames, generateQuestions } from "../lib/setup";

async function main() {
  await applyArenaNames();
  const n = await generateQuestions();
  const teams = await db.team.findMany({ select: { id: true } });
  for (const t of teams) await adminResetProgress(t.id);
  await setSetting("eventOpen", "true");

  const [mcq, ieee, distinct] = await Promise.all([
    db.question.count({ where: { kind: "mcq" } }),
    db.question.count({ where: { category: "ieee" } }),
    db.question.groupBy({ by: ["prompt", "options"] }),
  ]);
  const tracks = await db.track.findMany({ orderBy: { id: "asc" } });
  console.log(`Arenas: ${tracks.map((t) => t.name).join(", ")}`);
  console.log(`Questions: ${n} (${mcq} MCQ, ${n - mcq} text, ${ieee} IEEE SB VU) — distinct: ${distinct.length}`);
  console.log(`Reset ${teams.length} teams. Event is OPEN.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
