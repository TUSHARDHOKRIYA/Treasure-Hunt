import { NextResponse } from "next/server";

/**
 * Wraps an API route so a server error returns a short JSON reason (e.g. a database error code)
 * instead of a blank 500 — the phone shows its connection-problem message and retries, and the
 * cause shows up in logs and load tests.
 */
export function withErrors<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (e) {
      const err = e as { code?: string; name?: string; message?: string };
      console.error("API error:", err.code ?? err.name, err.message);
      return NextResponse.json(
        { error: "server_error", code: err.code ?? err.name ?? "unknown", detail: (err.message ?? "").slice(-300) },
        { status: 500 },
      );
    }
  };
}
