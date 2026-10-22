import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Connection budget: the Supabase pooler accepts at most 200 client connections in total, and a
 * burst of logins makes Vercel start many instances at once. So each instance keeps a pool of only
 * 2 connections (enough for its concurrent requests — queries take a few ms) and closes idle ones
 * after 30 s, so warm-but-quiet instances don't hold connections hostage.
 */
function datasourceUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw || !raw.startsWith("postgres")) return raw;
  const url = new URL(raw);
  url.searchParams.set("connection_limit", process.env.DB_CONNECTION_LIMIT || "2");
  url.searchParams.set("pool_timeout", "20");
  url.searchParams.set("connect_timeout", "10");
  url.searchParams.set("max_idle_connection_lifetime", "30");
  return url.toString();
}

export const db = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: datasourceUrl() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
