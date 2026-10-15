import { NextResponse } from "next/server";
import { getTeamId } from "@/lib/auth";
import { submitAnswer } from "@/lib/game";

export async function POST(req: Request) {
  const teamId = await getTeamId();
  if (!teamId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(await submitAnswer(teamId, String(body.answer ?? "")));
}
