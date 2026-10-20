import { Check, Lock } from "lucide-react";
import type { TeamState } from "@/lib/game";

export function TrackProgress({ progress }: { progress: TeamState["progress"] }) {
  return (
    <ol className="flex items-start">
      {progress.map((p, i) => {
        const color = p.track?.color ?? "#323C57";
        return (
          <li key={p.stage} className="flex flex-1 items-start last:flex-none">
            <div className="flex w-14 flex-col items-center gap-1.5">
              <div
                className={`relative grid h-10 w-10 place-items-center rounded-full border-2 text-sm font-bold transition ${
                  p.status === "current" ? "scale-110" : ""
                }`}
                style={{
                  borderColor: p.status === "locked" ? "#323C57" : color,
                  background: p.status === "done" ? color : p.status === "current" ? `${color}22` : "#111623",
                  color: p.status === "done" ? "#07090F" : p.status === "current" ? color : "#56607C",
                  boxShadow: p.status === "current" ? `0 0 0 6px ${color}1f` : undefined,
                }}
              >
                {p.status === "done" ? <Check className="h-5 w-5" strokeWidth={3} /> : p.status === "locked" ? <Lock className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`line-clamp-2 text-center text-[10px] font-medium leading-tight ${p.status === "locked" ? "text-ink-500" : "text-ink-300"}`}>
                {p.track?.name ?? `Arena ${i + 1}`}
              </span>
            </div>
            {i < progress.length - 1 && (
              <div className="mt-5 h-0.5 flex-1 rounded-full" style={{ background: p.status === "done" ? color : "#222A3F" }} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
