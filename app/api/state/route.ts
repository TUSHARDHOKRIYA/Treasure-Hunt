import { NextResponse } from "next/server";
import { getTeamId } from "@/lib/auth";
import { getTeamState } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function GET() {
  const teamId = await getTeamId();
  const state = teamId ? await getTeamState(teamId) : null;
  if (!state) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(state);
}
