/**
 * fetch for the phone app: gives up on a request that hangs and retries it, so a rare stalled
 * server connection costs a few seconds instead of a stuck screen. Safe for answers/scans because
 * the server ignores a duplicate submission (it only advances from the exact question it was on).
 */
export async function apiFetch(url: string, init: RequestInit = {}, { timeoutMs = 8000, retries = 2 } = {}): Promise<Response | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
      clearTimeout(timer);
      if (res.status >= 500 && attempt < retries) continue;
      return res;
    } catch {
      clearTimeout(timer);
      if (attempt < retries) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  return null;
}

export const postJson = (url: string, body: unknown) =>
  apiFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
