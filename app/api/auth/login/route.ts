import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { setTeamSession } from "@/lib/auth";
import { isEventOpen } from "@/lib/settings";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim().toUpperCase();
  const password = String(body.password ?? "");

  const team = code ? await db.team.findUnique({ where: { code } }) : null;
  if (!team || !(await bcrypt.compare(password, team.passwordHash))) {
    return NextResponse.json({ error: "Team code or password is incorrect." }, { status: 401 });
  }
  if (!(await isEventOpen())) {
    return NextResponse.json({ error: "The hunt hasn't started yet. Wait for the organisers' signal." }, { status: 403 });
  }

  if (config.timerStart === "login" && !team.startedAt) {
    await db.team.updateMany({ where: { id: team.id, startedAt: null }, data: { startedAt: new Date() } });
  }
  await setTeamSession(team.id);
  return NextResponse.json({ ok: true });
}
