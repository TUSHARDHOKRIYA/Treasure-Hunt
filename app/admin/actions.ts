"use server";

import bcrypt from "bcryptjs";
import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { clearAdminSession, isAdmin, requireAdmin, setAdminSession } from "@/lib/auth";
import { randomPassword, randomToken } from "@/lib/format";
import { adminResetProgress, adminSkipQuestion } from "@/lib/game";
import { setSetting } from "@/lib/settings";
import { buildTeams, generateQuestions, TeamInput } from "@/lib/setup";

/* ---------- auth ---------- */

export async function adminLogin(_: string | null, form: FormData): Promise<string | null> {
  // Username ignores case and spaces (phones auto-capitalise "admin" to "Admin"); password must match exactly.
  const username = String(form.get("username") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "").trim();
  if (username !== config.adminUsername.trim().toLowerCase() || password !== config.adminPassword) {
    return "Wrong username or password.";
  }
  await setAdminSession();
  redirect("/admin");
}

export async function adminLogout() {
  await clearAdminSession();
  redirect("/admin/login");
}

/* ---------- event ---------- */

export async function setEventOpen(open: boolean) {
  await requireAdmin();
  await setSetting("eventOpen", open ? "true" : "false");
  revalidatePath("/admin", "layout");
}

export async function setTimerStart(mode: "login" | "attendance") {
  await requireAdmin();
  await setSetting("timerStart", mode);
  revalidatePath("/admin", "layout");
}

/* ---------- per-team ---------- */

export async function skipQuestion(teamId: number) {
  await requireAdmin();
  await adminSkipQuestion(teamId);
  revalidatePath("/admin", "layout");
}

export async function addPenalty(teamId: number, seconds: number) {
  await requireAdmin();
  const team = await db.team.findUnique({ where: { id: teamId } });
  if (!team) return;
  await db.team.update({ where: { id: teamId }, data: { penaltySec: Math.max(0, team.penaltySec + seconds) } });
  revalidatePath("/admin", "layout");
}

export async function toggleMember(memberId: number) {
  await requireAdmin();
  const m = await db.member.findUnique({ where: { id: memberId } });
  if (!m) return;
  await db.member.update({ where: { id: memberId }, data: { present: !m.present, markedAt: m.present ? null : new Date() } });
  revalidatePath("/admin", "layout");
}

export async function forceAttendance(teamId: number) {
  await requireAdmin();
  const team = await db.team.findUnique({ where: { id: teamId } });
  if (!team || team.attendanceAt) return;
  const now = new Date();
  await db.team.update({ where: { id: teamId }, data: { attendanceAt: now, startedAt: team.startedAt ?? now } });
  revalidatePath("/admin", "layout");
}

export async function resetPassword(teamId: number): Promise<string> {
  await requireAdmin();
  const pw = randomPassword();
  await db.team.update({ where: { id: teamId }, data: { passwordHash: await bcrypt.hash(pw, 8) } });
  return pw;
}

export async function resetTeam(teamId: number) {
  await requireAdmin();
  await adminResetProgress(teamId);
  revalidatePath("/admin", "layout");
}

/* ---------- setup ---------- */

export async function updateTrack(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  await db.track.update({
    where: { id },
    data: {
      name: String(form.get("name") || "").trim() || `Track ${id}`,
      location: String(form.get("location") || "").trim(),
      color: /^#[0-9a-fA-F]{6}$/.test(String(form.get("color"))) ? String(form.get("color")) : "#F5B700",
    },
  });
  revalidatePath("/admin", "layout");
}

export async function resetAllProgress() {
  await requireAdmin();
  const teams = await db.team.findMany({ select: { id: true } });
  for (const t of teams) await adminResetProgress(t.id);
  revalidatePath("/admin", "layout");
}

/** Gives all 12 stations new secret codes. Old posters/printouts stop working; team routes are unchanged. */
export async function regenerateQrCodes() {
  await requireAdmin();
  const qrs = await db.qrCode.findMany({ select: { id: true } });
  await db.$transaction(qrs.map((q) => db.qrCode.update({ where: { id: q.id }, data: { token: randomToken() } })));
  revalidatePath("/admin", "layout");
}

export async function regeneratePlaceholders() {
  await requireAdmin();
  await generateQuestions();
  revalidatePath("/admin", "layout");
}

export type ImportResult = { ok: boolean; message: string; credentialsCsv?: string } | null;

function parseCsv(text: string) {
  const r = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });
  return r.data.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, (v ?? "").trim()])));
}

/** teams.csv: one row per member → team_code, team_name, password, member_name, roll_no, phone */
export async function importTeams(_: ImportResult, form: FormData): Promise<ImportResult> {
  if (!(await isAdmin())) return { ok: false, message: "Not signed in." };
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a CSV file first." };

  const rows = parseCsv(await file.text());
  const byCode = new Map<string, TeamInput>();
  for (const [i, r] of rows.entries()) {
    const code = (r.team_code || "").toUpperCase();
    if (!code || !r.member_name) return { ok: false, message: `Row ${i + 2}: team_code and member_name are required.` };
    if (!byCode.has(code)) byCode.set(code, { code, name: r.team_name || code, password: r.password || "", members: [] });
    const t = byCode.get(code)!;
    if (r.password && !t.password) t.password = r.password;
    t.members.push({ name: r.member_name, rollNo: r.roll_no || "", phone: r.phone || "" });
  }
  const teams = [...byCode.values()];
  if (teams.length === 0) return { ok: false, message: "No teams found in the file." };
  for (const t of teams) if (!t.password) t.password = randomPassword();

  await buildTeams(teams);
  const n = await generateQuestions();
  revalidatePath("/admin", "layout");
  return {
    ok: true,
    message: `Imported ${teams.length} teams with a fresh balanced schedule and ${n} arena questions (unique per team).`,
    credentialsCsv: "team_code,team_name,password\n" + teams.map((t) => `${t.code},"${t.name}",${t.password}`).join("\n"),
  };
}

/**
 * questions.csv: team_code, track, slot, question, answers, type, options, category, takeaway
 * - answers: alternatives separated by |   (for MCQ: the correct option, exactly as written in options)
 * - type: text | mcq        options: MCQ choices separated by |
 */
export async function importQuestions(_: ImportResult, form: FormData): Promise<ImportResult> {
  if (!(await isAdmin())) return { ok: false, message: "Not signed in." };
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a CSV file first." };

  const rows = parseCsv(await file.text());
  const teams = await db.team.findMany({ select: { id: true, code: true } });
  const teamId = new Map(teams.map((t) => [t.code, t.id]));
  const data: {
    teamId: number;
    trackId: number;
    slot: number;
    prompt: string;
    answers: string;
    kind: string;
    options: string;
    category: string;
    takeaway: string;
  }[] = [];

  for (const [i, r] of rows.entries()) {
    const id = teamId.get((r.team_code || "").toUpperCase());
    const track = Number(r.track);
    const slot = Number(r.slot);
    const prompt = r.question || "";
    const answers = r.answers || r.answer || "";
    if (!id) return { ok: false, message: `Row ${i + 2}: unknown team_code "${r.team_code}".` };
    if (![1, 2, 3, 4].includes(track) || ![1, 2, 3, 4].includes(slot)) return { ok: false, message: `Row ${i + 2}: track and slot must be 1–4.` };
    if (!prompt || !answers) return { ok: false, message: `Row ${i + 2}: question and answers are required.` };
    const kind = (r.type || "text").toLowerCase() === "mcq" ? "mcq" : "text";
    const options = (r.options || "").split("|").map((o) => o.trim()).filter(Boolean);
    if (kind === "mcq" && (options.length < 2 || !options.includes(answers.trim()))) {
      return { ok: false, message: `Row ${i + 2}: an MCQ needs at least 2 options and the answer must be one of them.` };
    }
    data.push({
      teamId: id,
      trackId: track,
      slot,
      prompt,
      answers: kind === "mcq" ? answers.trim() : answers,
      kind,
      options: kind === "mcq" ? JSON.stringify(options) : "",
      category: r.category || "",
      takeaway: r.takeaway || "",
    });
  }

  await db.$transaction(
    data.map((d) =>
      db.question.upsert({
        where: { teamId_trackId_slot: { teamId: d.teamId, trackId: d.trackId, slot: d.slot } },
        update: { prompt: d.prompt, answers: d.answers, kind: d.kind, options: d.options, category: d.category, takeaway: d.takeaway },
        create: d,
      }),
    ),
  );
  revalidatePath("/admin", "layout");
  const total = await db.question.count();
  return { ok: true, message: `Saved ${data.length} questions. The database now holds ${total} of ${teams.length * 16} needed.` };
}
