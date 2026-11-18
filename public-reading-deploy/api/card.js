import handler from "../../api/card.js";
import { CANONICAL_ORIGIN, deploymentAuthorized, publicReadingOriginAllowed } from "../authorization.js";
import { CARD_DEADLINE_MS, deadlineExceededResult, renderWithinDeadline } from "../card-deadline.js";
import { CARD_CACHE, cardRequestPolicy } from "../card-request.js";
export const config = { runtime: "edge" };
const CARD_SLOW_RENDER_MS = 5000;
export default async function publicReadingCard(req) {
  const url = new URL(req.url);
  if (!deploymentAuthorized()) return new Response("unavailable", { status: 503 });
  if (!publicReadingOriginAllowed(url.origin)) return new Response("unavailable", { status: 421 });
  if (!["GET", "HEAD"].includes(req.method)) return new Response("method not allowed", { status: 405 });
  // Only the cards the site builds are drawn (card-request.js): any other parameter is refused before font, logo, database or render work.
  const policy = cardRequestPolicy(url);
  if (!policy.ok) {
    return new Response("not a site card", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" } });
  }
  // The render happens while the body is read, so the deadline covers the body too (see card-deadline.js). A card that
  // misses it answers 504 instead of holding the invocation until the platform's 300 s limit, and its render is cancelled.
  const started = Date.now();
  let result = await renderWithinDeadline(() => handler(req));
  const renderMs = Date.now() - started;
  if (!result) {
    console.error(`api/card: render exceeded ${CARD_DEADLINE_MS} ms, answered 504 (${url.search.slice(0, 200)})`);
    result = deadlineExceededResult();
  } else if (renderMs > CARD_SLOW_RENDER_MS) {
    // Diagnostics for the 300 s timeouts (18.11.2026): a slow render is logged here; a timeout with no such line was not the render.
    console.warn(`api/card: slow render ${renderMs} ms, ${result.body.byteLength} B (${url.search.slice(0, 200)})`);
  }
  const headers = new Headers(result.headers);
  headers.set("Server-Timing", `render;dur=${renderMs}`);
  // DEF-015: a share card is a pure function of its query string, and crawlers (WhatsApp, Facebook, Telegram) re-fetch it on every share. Only a
  // successful GET on the canonical origin may be cached at the CDN; protected-review origins and every error stay no-store. How long depends on
  // whether the card reads the database (card-request.js).
  const cacheable = req.method === "GET" && url.origin === CANONICAL_ORIGIN && result.status === 200;
  headers.set("Cache-Control", cacheable ? CARD_CACHE[policy.cacheClass] : "no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return new Response(req.method === "HEAD" ? null : result.body, { status: result.status, headers });
}
