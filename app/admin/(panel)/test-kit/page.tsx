import QRCode from "qrcode";
import { db } from "@/lib/db";
import { STATIONS } from "@/lib/config";
import { getBaseUrl } from "@/lib/base-url";
import { parseOrder } from "@/lib/schedule";
import { PrintButton } from "@/components/admin/PrintButton";

const TEST_TEAMS = ["TEAM01", "TEAM02"];
const INVALID_TOKEN = "notarealcode";

type Qr = { label: string; trackId: number; station: string; color: string; trackName: string; svg: string };

export default async function TestKitPage() {
  const baseUrl = await getBaseUrl();
  const [qrs, teams] = await Promise.all([
    db.qrCode.findMany({ include: { track: true }, orderBy: [{ trackId: "asc" }, { station: "asc" }] }),
    db.team.findMany({
      where: { code: { in: TEST_TEAMS } },
      orderBy: { code: "asc" },
      include: { assignments: { include: { qrCode: true, track: true } }, questions: true },
    }),
  ]);

  const svg = (url: string) => QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  const codes: Qr[] = await Promise.all(
    qrs.map(async (q) => ({
      label: `T${q.trackId}-${q.station}`,
      trackId: q.trackId,
      station: q.station,
      color: q.track.color,
      trackName: q.track.name,
      svg: await svg(`${baseUrl}/s/${q.token}`),
    })),
  );
  const invalidSvg = await svg(`${baseUrl}/s/${INVALID_TOKEN}`);

  return (
    <div className="space-y-8">
      <div className="no-print flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-gold-400">Testing</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">QR test kit</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-400">
            Scan these from a phone signed in as {TEST_TEAMS.join(" or ")}. Codes point to{" "}
            <span className="font-mono text-ink-300">{baseUrl}</span>. Use the in-app &ldquo;Scan QR code&rdquo; button; the phone camera app works too.
          </p>
        </div>
        <div className="md:w-48">
          <PrintButton />
        </div>
      </div>

      {/* All 12 station codes + one invalid code */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">All QR codes</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-4">
          {codes.map((c) => (
            <QrCard key={c.label} title={c.label} subtitle={`${c.trackName} · Station ${c.station}`} color={c.color} svg={c.svg} />
          ))}
          <QrCard title="INVALID" subtitle="Not a hunt code" color="#F87171" svg={invalidSvg} />
        </div>
      </section>

      {teams.map((team) => {
        const order = parseOrder(team.trackOrder);
        const stop = (i: number) => team.assignments.find((a) => a.stage === i)!;
        const label = (trackId: number, station: string) => `T${trackId}-${station}`;
        const s0 = stop(0);
        const s1 = stop(1);
        const otherStation = STATIONS.find((s) => s !== s0.qrCode.station)!;
        const answer = (trackId: number, slot: number) =>
          team.questions.find((q) => q.trackId === trackId && q.slot === slot)?.answers.split("|")[0] ?? "?";

        const steps: { action: string; expect: string; tone: "good" | "warn" | "bad" | "info" }[] = [
          { action: `Log in as ${team.code} → scan ${label(s0.trackId, s0.qrCode.station)} before marking attendance`, expect: "Attendance pending", tone: "warn" },
          { action: "Tick all 3 members, enter a wrong PIN (1111)", expect: "Wrong volunteer PIN", tone: "bad" },
          { action: "Enter PIN 2468 → Mark attendance", expect: `Travel screen: ${s0.track.name}, Station ${s0.qrCode.station}`, tone: "info" },
          { action: `Scan ${label(s1.trackId, "A")} (a different track)`, expect: "Incorrect track", tone: "bad" },
          { action: `Scan ${label(s0.trackId, otherStation)} (right track, wrong station)`, expect: `Right track, wrong QR code — find station ${s0.qrCode.station}`, tone: "warn" },
          { action: `Scan INVALID`, expect: "Not a hunt QR code", tone: "bad" },
          { action: `Scan ${label(s0.trackId, s0.qrCode.station)} (correct)`, expect: "Track unlocked! → Q1", tone: "good" },
          { action: `Scan ${label(s0.trackId, s0.qrCode.station)} again`, expect: "You're already in", tone: "good" },
          { action: `Scan ${label(s1.trackId, s1.qrCode.station)} while still solving`, expect: "Finish this track first", tone: "warn" },
          { action: "Q1: pick a WRONG option and lock it in", expect: "Question locked for 45 s, wrong option crossed out", tone: "bad" },
          { action: `After the lock, pick "${answer(s0.trackId, 1)}", then answer Q2 and Q3`, expect: "Correct! → next question", tone: "good" },
          { action: "Q4 riddle: type a wrong arena name", expect: "Not quite — wait 5 s", tone: "bad" },
          { action: `Type "${answer(s0.trackId, 4).toLowerCase()}" (any capitals work)`, expect: `Arena cleared! → head to ${s1.track.name}`, tone: "good" },
          { action: `Scan ${label(s0.trackId, s0.qrCode.station)} (finished track)`, expect: "Already completed", tone: "warn" },
          { action: "Open the app on a 2nd phone with the same login", expect: "Same progress & clock on both phones", tone: "info" },
          { action: "Complete stops 2–4 using the route below", expect: "Last arena Q3 & Q4 are IEEE SB VU questions", tone: "info" },
          { action: "Answer the IEEE SB VU Q3", expect: "Correct! + IEEE SB VU takeaway card", tone: "good" },
          { action: "Answer the final question", expect: "Takeaway, then Treasure found! — timer stops (green)", tone: "good" },
          { action: "Scan any code after finishing", expect: "You've finished!", tone: "good" },
        ];

        return (
          <section key={team.id} className="card break-before-page p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-bold">
                {team.code} · {team.name}
              </h2>
              <span className="font-mono text-sm text-ink-400">Group {team.seqGroup + 1}</span>
            </div>

            <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wider text-ink-400">Correct route</h3>
            <div className="grid gap-2 sm:grid-cols-4">
              {order.map((trackId, i) => {
                const a = stop(i);
                return (
                  <div key={i} className="rounded-xl border p-3" style={{ borderColor: `${a.track.color}66` }}>
                    <p className="text-xs text-ink-400">Stop {i + 1}</p>
                    <p className="font-semibold" style={{ color: a.track.color }}>
                      {a.track.name}
                    </p>
                    <p className="mt-1 font-mono text-lg font-bold">{label(trackId, a.qrCode.station)}</p>
                  </div>
                );
              })}
            </div>

            <h3 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-ink-400">Edge-case test script</h3>
            <ol className="space-y-1.5">
              {steps.map((s, i) => (
                <li key={i} className="grid gap-1 rounded-xl border border-ink-800 px-3 py-2 text-sm sm:grid-cols-[2rem_1fr_1fr] sm:items-center">
                  <span className="font-mono text-ink-500">{i + 1}</span>
                  <span className="text-ink-100">{s.action}</span>
                  <span
                    className={
                      s.tone === "good" ? "text-good" : s.tone === "warn" ? "text-warn" : s.tone === "bad" ? "text-bad" : "text-sky-300"
                    }
                  >
                    → {s.expect}
                  </span>
                </li>
              ))}
            </ol>

            <h3 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-ink-400">Answer key</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {order.map((trackId, i) => (
                <div key={i} className="rounded-xl border border-ink-800 p-3 text-sm">
                  <p className="mb-1 font-semibold">
                    Stop {i + 1} · {label(trackId, stop(i).qrCode.station)}
                  </p>
                  {[1, 2, 3, 4].map((slot) => (
                    <p key={slot} className="flex justify-between gap-2">
                      <span className="text-ink-400">Q{slot}</span>
                      <span className="truncate font-mono text-ink-100">{answer(trackId, slot)}</span>
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </section>
        );
      })}
      {teams.length === 0 && <p className="text-ink-400">Teams {TEST_TEAMS.join(", ")} don&apos;t exist yet.</p>}
    </div>
  );
}

function QrCard({ title, subtitle, color, svg }: { title: string; subtitle: string; color: string; svg: string }) {
  return (
    <div className="card flex flex-col items-center p-3 text-center print:break-inside-avoid print:border print:border-gray-300 print:bg-white print:text-black">
      <p className="font-mono text-lg font-bold" style={{ color }}>
        {title}
      </p>
      <div className="mt-2 w-full max-w-[170px] rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-2 text-xs text-ink-400 print:text-gray-600">{subtitle}</p>
    </div>
  );
}
