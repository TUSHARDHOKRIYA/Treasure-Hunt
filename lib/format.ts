export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Lowercase, no look-alike characters, so it can also be typed by hand. */
export function randomToken(len = 8): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function randomPassword(): string {
  const words = ["gold", "map", "key", "chest", "pearl", "ruby", "coin", "sail", "isle", "cove", "reef", "jade"];
  const w = words[Math.floor(Math.random() * words.length)];
  return `${w}${Math.floor(1000 + Math.random() * 9000)}`;
}
