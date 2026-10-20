import { AlertTriangle, CheckCircle2, MapPinOff, QrCode, Repeat } from "lucide-react";
import type { ScanResponse } from "@/lib/game";

type Tone = "good" | "warn" | "bad";

export function describeScan(r: ScanResponse): { tone: Tone; title: string; body: string; Icon: typeof CheckCircle2 } {
  const track = r.scannedTrack?.name;
  switch (r.result) {
    case "OK":
      return { tone: "good", title: "Arena unlocked!", body: `Welcome to ${track}. Your first question is ready.`, Icon: CheckCircle2 };
    case "ALREADY_IN":
      return { tone: "good", title: "You're already in", body: `Keep going — your questions at ${track} are waiting.`, Icon: CheckCircle2 };
    case "WRONG_TRACK":
      return {
        tone: "bad",
        title: "Incorrect arena",
        body: `This QR code belongs to ${track}. That isn't your destination — re-read your clue.`,
        Icon: MapPinOff,
      };
    case "WRONG_QR":
      return {
        tone: "warn",
        title: "Right arena, wrong QR code",
        body: r.correctStation
          ? `You're at the correct arena, but this is station ${r.scannedStation}. Find station ${r.correctStation}.`
          : `You're at the correct arena, but you scanned the wrong QR code. Look for another one here.`,
        Icon: AlertTriangle,
      };
    case "TRACK_DONE":
      return { tone: "warn", title: "Already completed", body: `You've already conquered ${track}. Head to your next destination.`, Icon: Repeat };
    case "BUSY":
      return { tone: "warn", title: "Finish this arena first", body: "Answer all the questions in your current arena before moving on.", Icon: AlertTriangle };
    case "NEED_ATTENDANCE":
      return { tone: "warn", title: "Attendance pending", body: "Mark your team's attendance before scanning.", Icon: AlertTriangle };
    case "FINISHED":
      return { tone: "good", title: "You've finished!", body: "Your hunt is complete. Head back to the base.", Icon: CheckCircle2 };
    default:
      return { tone: "bad", title: "Not a hunt QR code", body: "This code isn't part of the treasure hunt. Try again.", Icon: QrCode };
  }
}

const toneStyles: Record<Tone, string> = {
  good: "text-good bg-good/10 ring-good/30",
  warn: "text-warn bg-warn/10 ring-warn/30",
  bad: "text-bad bg-bad/10 ring-bad/30",
};

export function ScanResultView({ result }: { result: ScanResponse }) {
  const d = describeScan(result);
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`mb-5 grid h-20 w-20 place-items-center rounded-full ring-8 ${toneStyles[d.tone]} ${d.tone === "bad" ? "animate-shake" : "animate-pop"}`}>
        <d.Icon className="h-10 w-10" strokeWidth={2.2} />
      </div>
      {result.scannedTrack && (
        <span
          className="mb-3 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
          style={{ background: `${result.scannedTrack.color}22`, color: result.scannedTrack.color }}
        >
          Scanned: {result.scannedTrack.name}
          {result.scannedStation ? ` · Station ${result.scannedStation}` : ""}
        </span>
      )}
      <h2 className="text-2xl font-bold">{d.title}</h2>
      <p className="mt-2 max-w-xs text-ink-300">{d.body}</p>
    </div>
  );
}
