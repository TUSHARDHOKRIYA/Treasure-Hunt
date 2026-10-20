/**
 * Writes exports/questions.csv (every team's 16 questions + answers) and
 * exports/logins.csv (admin login + every team's code, password and members).
 *   npx tsx --env-file=.env scripts/export-csv.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Papa from "papaparse";
import { db } from "../lib/db";
import { parseOrder } from "../lib/schedule";

const OUT = "exports";

async function main() {
  mkdirSync(OUT, { recursive: true });
  const [teams, tracks, qrs] = await Promise.all([
    db.team.findMany({
      orderBy: { code: "asc" },
      include: { questions: true, members: { orderBy: { id: "asc" } }, assignments: { include: { qrCode: true } } },
    }),
    db.track.findMany(),
    db.qrCode.findMany(),
  ]);
  const arena = (id: number) => tracks.find((t) => t.id === id)?.name ?? `Arena ${id}`;

  // ---- questions.csv
  const qRows = teams.flatMap((team) =>
    parseOrder(team.trackOrder).flatMap((trackId, stage) =>
      [1, 2, 3, 4].map((slot) => {
        const q = team.questions.find((x) => x.trackId === trackId && x.slot === slot);
        const options = q?.options ? (JSON.parse(q.options) as string[]) : [];
        const station = team.assignments.find((a) => a.trackId === trackId)?.qrCode.station ?? "";
        return {
          team_code: team.code,
          team_name: team.name,
          stop: stage + 1,
          arena: arena(trackId),
          qr_station: `T${trackId}-${station}`,
          question_no: slot,
          type: q?.kind === "mcq" ? "MCQ" : "Text",
          category: q?.category === "ieee" ? "IEEE SB VU" : q?.category === "riddle" ? "Riddle (next arena)" : "Arena question",
          question: q?.prompt.replace(/\n/g, " ") ?? "",
          option_a: options[0] ?? "",
          option_b: options[1] ?? "",
          option_c: options[2] ?? "",
          option_d: options[3] ?? "",
          correct_answer: q ? (q.kind === "mcq" ? q.answers : q.answers.split("|")[0]) : "",
          also_accepted: q && q.kind !== "mcq" ? q.answers.split("|").slice(1).join(" / ") : "",
          takeaway: q?.takeaway ?? "",
        };
      }),
    ),
  );
  writeFileSync(`${OUT}/questions.csv`, "﻿" + Papa.unparse(qRows));

  // ---- logins.csv (passwords are only stored hashed, so they come from credentials.csv)
  const pw = Object.fromEntries(
    readFileSync("credentials.csv", "utf8")
      .trim()
      .split("\n")
      .slice(1)
      .map((l) => l.split(",").map((x) => x.trim()))
      .map(([code, , p]) => [code, p]),
  );
  const site = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
  const loginRows = [
    {
      role: "ADMIN",
      login_id: process.env.ADMIN_USERNAME || "admin",
      password: process.env.ADMIN_PASSWORD || "admin123",
      team_name: "",
      login_url: `${site}/admin`,
      route: "",
      member_1: "",
      member_2: "",
      member_3: "",
    },
    {
      role: "VOLUNTEER PIN",
      login_id: "(attendance check-in)",
      password: process.env.ATTENDANCE_PIN || "",
      team_name: "",
      login_url: "",
      route: "",
      member_1: "",
      member_2: "",
      member_3: "",
    },
    ...teams.map((t) => {
      const m = t.members.map((x) => [x.name, x.rollNo, x.phone].filter(Boolean).join(" · "));
      return {
        role: "TEAM",
        login_id: t.code,
        password: pw[t.code] ?? "(reset in admin)",
        team_name: t.name,
        login_url: `${site}/login`,
        route: parseOrder(t.trackOrder)
          .map((id) => `${arena(id)} (T${id}-${t.assignments.find((a) => a.trackId === id)?.qrCode.station ?? "?"})`)
          .join(" → "),
        member_1: m[0] ?? "",
        member_2: m[1] ?? "",
        member_3: m[2] ?? "",
      };
    }),
  ];
  writeFileSync(`${OUT}/logins.csv`, "﻿" + Papa.unparse(loginRows));

  console.log(`exports/questions.csv: ${qRows.length} rows | exports/logins.csv: ${loginRows.length} rows (${qrs.length} QR stations)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
