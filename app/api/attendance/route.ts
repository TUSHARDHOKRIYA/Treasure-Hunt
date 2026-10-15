import { NextResponse } from "next/server";
import { getTeamId } from "@/lib/auth";
import { markAttendance } from "@/lib/game";

export async function POST(req: Request) {
  const teamId = await getTeamId();
  if (!teamId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.presentIds) ? body.presentIds.map(Number).filter(Number.isInteger) : [];
  const r = await markAttendance(teamId, ids, String(body.pin ?? ""));
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
