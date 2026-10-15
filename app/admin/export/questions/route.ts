import Papa from "papaparse";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { parseOrder } from "@/lib/schedule";

export const dynamic = "force-dynamic";

/** Every team × track × slot, with the current question and (for slot 4) which track it must lead to. */
export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });

  const [teams, tracks] = await Promise.all([
    db.team.findMany({ orderBy: { code: "asc" }, include: { questions: true } }),
    db.track.findMany(),
  ]);
  const name = (id?: number) => tracks.find((t) => t.id === id)?.name ?? "";

  const rows = teams.flatMap((team) => {
    const order = parseOrder(team.trackOrder);
    return order.flatMap((trackId, stage) =>
      [1, 2, 3, 4].map((slot) => {
        const q = team.questions.find((x) => x.trackId === trackId && x.slot === slot);
        return {
          team_code: team.code,
          track: trackId,
          slot,
          question: q?.prompt ?? "",
          answers: q?.answers ?? "",
          stop_number: stage + 1,
          note: slot < 4 ? "" : stage < 3 ? `Riddle must lead to: ${name(order[stage + 1])}` : "FINAL question (stops the clock)",
        };
      }),
    );
  });

  return new Response("﻿" + Papa.unparse(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="questions.csv"',
    },
  });
}
