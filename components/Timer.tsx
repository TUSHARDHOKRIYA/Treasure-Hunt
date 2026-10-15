"use client";

import { useEffect, useState } from "react";
import { Timer as TimerIcon } from "lucide-react";
import { formatDuration } from "@/lib/format";

/** Live clock driven by server timestamps; `offset` corrects for phone clock drift. */
export function Timer({
  startedAt,
  finishedAt,
  penaltySec,
  serverNow,
}: {
  startedAt: number | null;
  finishedAt: number | null;
  penaltySec: number;
  serverNow: number;
}) {
  // First render uses the server's clock so SSR and hydration agree.
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    const offset = serverNow - Date.now();
    setNow(Date.now() + offset);
    if (finishedAt) return;
    const id = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(id);
  }, [serverNow, finishedAt]);

  const ms = startedAt ? (finishedAt ?? now) - startedAt + penaltySec * 1000 : 0;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-sm font-bold tabular-nums ${
        finishedAt ? "border-good/40 bg-good/10 text-good" : "border-gold-400/30 bg-gold-400/10 text-gold-300"
      }`}
      aria-label="Elapsed time"
    >
      <TimerIcon className="h-4 w-4" strokeWidth={2.5} />
      {formatDuration(ms)}
    </div>
  );
}
