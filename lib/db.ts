import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Vercel runs many requests concurrently in one instance. With a single pooled connection
 * (connection_limit=1) a burst queues behind one slow query and requests hang until they are
 * cut off, so give each instance a small pool and fail fast instead of hanging.
 */
function datasourceUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw || !raw.startsWith("postgres")) return raw;
  const url = new URL(raw);
  url.searchParams.set("connection_limit", process.env.DB_CONNECTION_LIMIT || "8");
  url.searchParams.set("pool_timeout", "15");
  url.searchParams.set("connect_timeout", "10");
  return url.toString();
}

export const db = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: datasourceUrl() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
