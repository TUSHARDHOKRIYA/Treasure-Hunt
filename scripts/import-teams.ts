/**
 * Replaces all teams with the cleaned registration list, draws a fresh balanced route for each,
 * generates unique questions and writes credentials.csv.
 *   npx tsx --env-file=.env scripts/import-teams.ts exports/teams-from-excel.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { db } from "../lib/db";
import { randomPassword } from "../lib/format";
import { buildTeams, generateQuestions, TeamInput } from "../lib/setup";

type Row = { code: string; name: string; members: { name: string; phone: string; year: string; dept: string }[] };

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("usage: tsx scripts/import-teams.ts <teams.json>");
  const rows: Row[] = JSON.parse(readFileSync(file, "utf8"));

  const teams: TeamInput[] = rows.map((r) => ({
    code: r.code,
    name: r.name,
    password: randomPassword(),
    members: r.members.map((m) => ({
      name: m.name,
      rollNo: [m.year, m.dept].filter(Boolean).join(" · "),
      phone: m.phone,
    })),
  }));

  await buildTeams(teams); // keeps the existing QR codes, wipes old teams
  const n = await generateQuestions();

  writeFileSync(
    "credentials.csv",
    "team_code,team_name,password\n" + teams.map((t) => `${t.code},${t.name},${t.password}`).join("\n") + "\n",
  );
  console.log(`Imported ${teams.length} teams (${teams.reduce((a, t) => a + t.members.length, 0)} people), ${n} questions. Passwords → credentials.csv`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
