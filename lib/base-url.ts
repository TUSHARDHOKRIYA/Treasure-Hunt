import { headers } from "next/headers";
import { config } from "./config";

/**
 * The site's public address for QR codes: the host the admin is browsing on (so posters always
 * match the live deployment), falling back to PUBLIC_BASE_URL when there is no request host.
 */
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return config.publicBaseUrl;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
