import { NextResponse } from "next/server";
import { getTeamId } from "@/lib/auth";
import { scanQr } from "@/lib/game";

export async function POST(req: Request) {
  const teamId = await getTeamId();
  if (!teamId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  return NextResponse.json(await scanQr(teamId, String(body.code ?? "")));
}
