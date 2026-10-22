import { withErrors } from "@/lib/api";
import { NextResponse } from "next/server";
import { getTeamId } from "@/lib/auth";
import { getTeamState } from "@/lib/game";

export const dynamic = "force-dynamic";

export const GET = withErrors(async function get() {
  const teamId = await getTeamId();
  const state = teamId ? await getTeamState(teamId) : null;
  if (!state) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(state);
});
