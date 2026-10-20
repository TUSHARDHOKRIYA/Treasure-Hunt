/**
 * Exports every station QR code as a PNG plus a testing guide.
 *   npm run qr:export -- https://your-app.vercel.app
 * Output: qr-codes/*.png and qr-codes/QR-TESTING-INSTRUCTIONS.txt
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import QRCode from "qrcode";
import { db } from "../lib/db";
import { STATIONS } from "../lib/config";
import { parseOrder } from "../lib/schedule";

const TEST_TEAMS: Record<string, string> = { TEAM01: "demo123" };
const INVALID_TOKEN = "notarealcode";
const OUT = "qr-codes";

async function main() {
  const base = (process.argv[2] || process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
  if (!/^https?:\/\//.test(base)) throw new Error("Pass your site URL: npm run qr:export -- https://your-app.vercel.app");

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT);

  const qrs = await db.qrCode.findMany({ include: { track: true }, orderBy: [{ trackId: "asc" }, { station: "asc" }] });
  const png = (url: string, file: string) => QRCode.toFile(`${OUT}/${file}`, url, { width: 800, margin: 2, errorCorrectionLevel: "M" });

  for (const q of qrs) {
    await png(`${base}/s/${q.token}`, `T${q.trackId}-${q.station}_${q.track.name.replace(/\W+/g, "-")}.png`);
  }
  await png(`${base}/s/${INVALID_TOKEN}`, "INVALID_not-a-hunt-code.png");

  // Passwords for the test teams come from credentials.csv when available.
  try {
    const csv = (await import("node:fs")).readFileSync("credentials.csv", "utf8").trim().split("\n").slice(1);
    for (const line of csv) {
      const [code, , pw] = line.split(",");
      if (code === "TEAM01" || code === "TEAM02") TEAM_PW[code] = pw;
    }
  } catch {}

  const teams = await db.team.findMany({
    where: { code: { in: ["TEAM01", "TEAM02"] } },
    orderBy: { code: "asc" },
    include: { assignments: { include: { qrCode: true, track: true } }, questions: true },
  });

  const L: string[] = [];
  const hr = "=".repeat(64);
  L.push(hr, "  TREASURE HUNT — QR SCANNING & TESTING GUIDE", hr, "");
  L.push(`Site:        ${base}`, `Admin panel: ${base}/admin`, `Volunteer PIN (attendance): ${process.env.ATTENDANCE_PIN || "(none)"}`, "");
  L.push("FILES IN THIS FOLDER", "-".repeat(64));
  L.push("  T<track>-<station>_<name>.png  12 station QR codes (4 tracks x stations A/B/C)");
  L.push("  INVALID_not-a-hunt-code.png    a fake code, for testing the error message");
  L.push("");
  L.push("HOW TO SCAN", "-".repeat(64));
  L.push("  Option 1 (recommended) — in-app scanner:");
  L.push("    1. Open the site on your phone and log in with the team code + password.");
  L.push("    2. Tap the yellow 'Scan QR code' button.");
  L.push("    3. Allow camera access when the browser asks.");
  L.push("    4. Point the camera at the QR (on paper or on a laptop screen).");
  L.push("  Option 2 — phone's normal camera app:");
  L.push("    Scan the QR, tap the link that appears. If not logged in, you'll be asked");
  L.push("    to log in first and then the scan is checked automatically.");
  L.push("  Option 3 — no camera:");
  L.push("    In the scanner tap 'Enter code manually' and type the code printed in the");
  L.push("    list below (lowercase).");
  L.push("");
  L.push("  Tips: camera needs HTTPS (works on the Vercel URL, not on http://localhost).");
  L.push("  If the camera is blocked: browser settings > Site settings > Camera > Allow.");
  L.push("  Turn screen brightness up when scanning from a laptop screen.");
  L.push("");
  L.push("ALL QR CODES", "-".repeat(64));
  for (const q of qrs) L.push(`  T${q.trackId}-${q.station}  ${q.track.name.padEnd(18)} Station ${q.station}   manual code: ${q.token}`);
  L.push(`  INVALID ${"(fake code)".padEnd(18)}             manual code: ${INVALID_TOKEN}`);
  L.push("");

  for (const t of teams) {
    const order = parseOrder(t.trackOrder);
    const stop = (i: number) => t.assignments.find((a) => a.stage === i)!;
    const lbl = (i: number) => `T${stop(i).trackId}-${stop(i).qrCode.station}`;
    const ans = (trackId: number, slot: number) => t.questions.find((q) => q.trackId === trackId && q.slot === slot)?.answers.split("|")[0] ?? "?";
    const s0 = stop(0);
    const s1 = stop(1);
    const wrongStation = `T${s0.trackId}-${STATIONS.find((s) => s !== s0.qrCode.station)}`;

    L.push(hr, `  ${t.code} — ${t.name}    password: ${TEAM_PW[t.code] ?? "(see credentials.csv)"}`, hr, "");
    L.push("  CORRECT ROUTE");
    order.forEach((_, i) => L.push(`    Stop ${i + 1}: ${stop(i).track.name.padEnd(18)} scan ${lbl(i)}`));
    L.push("");
    L.push("  EDGE-CASE TEST SCRIPT                                  EXPECTED RESULT");
    const steps: [string, string][] = [
      [`Log in, scan ${lbl(0)} BEFORE marking attendance`, "Attendance pending"],
      ["Tick all 3 members, enter wrong PIN 1111", "Wrong volunteer PIN"],
      [`Enter the real PIN, tap Mark attendance`, `Go to ${s0.track.name}, Station ${s0.qrCode.station}`],
      [`Scan T${s1.trackId}-A (a different track)`, "Incorrect track"],
      [`Scan ${wrongStation} (right track, wrong station)`, `Right track, wrong QR — find ${s0.qrCode.station}`],
      ["Scan INVALID", "Not a hunt QR code"],
      [`Scan ${lbl(0)} (correct)`, "Track unlocked! -> Question 1"],
      [`Scan ${lbl(0)} again`, "You're already in"],
      [`Scan ${lbl(1)} while still answering`, "Finish this track first"],
      ["Answer Q1 (text) wrong (e.g. 0)", "Not quite — locked for 5 seconds"],
      [`Answer Q1 as "  ${ans(s0.trackId, 1)}!" (spaces/punctuation)`, "Correct! (case/punctuation ignored)"],
      ["Q2 is multiple-choice: pick a WRONG option", "Locked 45 s, wrong option crossed out"],
      ["After the lock, pick the right option, do Q3 + Q4 riddle", `Arena cleared! -> go to ${s1.track.name}`],
      [`Scan ${lbl(0)} again (finished track)`, "Already completed"],
      ["Log in on a 2nd phone with the same team", "Same progress and same clock"],
      ["Finish stops 2-4 using the route above", "Last arena Q3 & Q4 are IEEE SB VU"],
      ["Answer the IEEE SB VU Q3", "Correct! + IEEE SB VU takeaway"],
      ["Answer the final question", "Takeaway, then Treasure found!"],
      ["Scan any QR after finishing", "You've finished!"],
    ];
    steps.forEach(([a, e], i) => L.push(`  ${String(i + 1).padStart(2)}. ${a.padEnd(52)} ${e}`));
    L.push("");
    L.push("  ANSWER KEY");
    order.forEach((trackId, i) => {
      L.push(`    Stop ${i + 1} (${lbl(i)}): ` + [1, 2, 3, 4].map((s) => `Q${s}=${ans(trackId, s)}`).join("   "));
    });
    L.push("");
  }

  L.push(hr, "  RESET AFTER TESTING", hr);
  L.push("  Admin panel > Live > open the team > 'Reset progress'");
  L.push("  (or Setup > 'Reset all team progress' to clear every team).");
  L.push("");

  writeFileSync(`${OUT}/QR-TESTING-INSTRUCTIONS.txt`, L.join("\r\n"));
  console.log(`Wrote ${qrs.length + 1} PNGs and QR-TESTING-INSTRUCTIONS.txt to ${OUT}/ for ${base}`);
}

const TEAM_PW: Record<string, string> = { ...TEST_TEAMS };

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
