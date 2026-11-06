import handler from "../../api/card.js";
import { CANONICAL_ORIGIN, deploymentAuthorized, publicReadingOriginAllowed } from "../authorization.js";
export const config = { runtime: "edge" };
export default async function publicReadingCard(req) {
  const url = new URL(req.url);
  if (!deploymentAuthorized()) return new Response("unavailable", { status: 503 });
  if (!publicReadingOriginAllowed(url.origin)) return new Response("unavailable", { status: 421 });
  if (!["GET", "HEAD"].includes(req.method)) return new Response("method not allowed", { status: 405 });
  const result = await handler(req);
  const headers = new Headers(result.headers);
  // DEF-015: a share card is a pure function of its query string, and crawlers (WhatsApp, Facebook, Telegram) re-fetch it on every share. Only a
  // successful GET on the canonical origin may be cached at the CDN; protected-review origins and every error stay no-store.
  const cacheable = req.method === "GET" && url.origin === CANONICAL_ORIGIN && result.status === 200;
  headers.set("Cache-Control", cacheable ? "public, s-maxage=3600, stale-while-revalidate=86400" : "no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return new Response(req.method === "HEAD" ? null : result.body, { status: result.status, headers });
}
