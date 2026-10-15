import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const TEAM_COOKIE = "th_team";
const ADMIN_COOKIE = "th_admin";

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");
}

async function sign(payload: Record<string, unknown>) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("2d").sign(secret());
}

async function verify(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload;
  } catch {
    return null;
  }
}

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 48,
};

export async function setTeamSession(teamId: number) {
  (await cookies()).set(TEAM_COOKIE, await sign({ teamId }), cookieOpts);
}

export async function getTeamId(): Promise<number | null> {
  const p = await verify((await cookies()).get(TEAM_COOKIE)?.value);
  return typeof p?.teamId === "number" ? p.teamId : null;
}

export async function clearTeamSession() {
  (await cookies()).delete(TEAM_COOKIE);
}

export async function setAdminSession() {
  (await cookies()).set(ADMIN_COOKIE, await sign({ admin: true }), cookieOpts);
}

export async function isAdmin(): Promise<boolean> {
  const p = await verify((await cookies()).get(ADMIN_COOKIE)?.value);
  return p?.admin === true;
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
