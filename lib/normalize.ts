/** Case/space/punctuation-insensitive answer matching. */
export function normalizeAnswer(s: string): string {
  return s
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[̀-ͯ]/g, "")
    .replace(/^(the|a|an)\s+/, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function isCorrect(given: string, accepted: string): boolean {
  const g = normalizeAnswer(given);
  if (!g) return false;
  return accepted.split("|").some((a) => normalizeAnswer(a) === g);
}
