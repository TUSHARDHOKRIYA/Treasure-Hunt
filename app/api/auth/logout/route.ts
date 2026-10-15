import { NextResponse } from "next/server";
import { clearTeamSession } from "@/lib/auth";

export async function POST() {
  await clearTeamSession();
  return NextResponse.json({ ok: true });
}
