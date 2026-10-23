import { db } from "./db";

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string) {
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

/** When a team's clock starts. Stored in the DB so organisers can switch it from Admin → Setup. */
export async function getTimerStart(): Promise<"login" | "attendance"> {
  const v = await getSetting("timerStart", process.env.TIMER_START === "login" ? "login" : "attendance");
  return v === "login" ? "login" : "attendance";
}

export async function isEventOpen() {
  return (await getSetting("eventOpen", "false")) === "true";
}
