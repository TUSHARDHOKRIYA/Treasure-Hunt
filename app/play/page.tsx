import { redirect } from "next/navigation";
import { getTeamId } from "@/lib/auth";
import { getTeamState } from "@/lib/game";
import { GameClient } from "./GameClient";

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const teamId = await getTeamId();
  const state = teamId ? await getTeamState(teamId) : null;
  if (!state) redirect("/login");
  return <GameClient initial={state} />;
}
