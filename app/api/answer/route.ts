import { withErrors } from "@/lib/api";
import { NextResponse } from "next/server";
import { getTeamId } from "@/lib/auth";
import { getTeamState, submitAnswer } from "@/lib/game";

export const POST = withErrors(async function post(req: Request) {
  const teamId = await getTeamId();
  if (!teamId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const expected =
    Number.isInteger(body.stage) && Number.isInteger(body.questionNo) ? { stage: body.stage, questionNo: body.questionNo } : undefined;
  const result = await submitAnswer(teamId, String(body.answer ?? ""), expected);
  // Send the new state back so the phone doesn't need a second request.
  return NextResponse.json({ ...result, state: await getTeamState(teamId) });
});
