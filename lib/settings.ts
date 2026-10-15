import { db } from "./db";

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string) {
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

export async function isEventOpen() {
  return (await getSetting("eventOpen", "false")) === "true";
}
