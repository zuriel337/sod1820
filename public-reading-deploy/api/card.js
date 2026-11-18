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
  // Only an oversized request is refused (card-request.js); unknown parameters are ignored so old links keep their image.
  const policy = cardRequestPolicy(url);
  if (!policy.ok) {
    return new Response("card request too large", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" } });
  }
  // The render happens while the body is produced, so the deadline covers the body too (see card-deadline.js). A card that misses it
  // answers 504 instead of holding the invocation until the platform's 300 s limit. The phases are measured separately: the response object
  // returned (responseMs), the last body byte read (bodyMs), and this handler's return (totalMs); the platform's own duration is separate.
  const started = Date.now();
  const progress = {};
  let result = await renderWithinDeadline(() => handler(req), CARD_DEADLINE_MS, progress);
  const totalMs = Date.now() - started;
  const phases = `response ${progress.responseMs ?? "-"} ms, body ${progress.bodyMs ?? "-"} ms, ${progress.bytes ?? 0} B, total ${totalMs} ms`;
  if (!result) {
    console.error(`api/card: render exceeded ${CARD_DEADLINE_MS} ms, answered 504 (${phases}) (${url.search.slice(0, 200)})`);
    result = deadlineExceededResult();
  } else if (totalMs > CARD_SLOW_RENDER_MS) {
    // Diagnostics for the 300 s timeouts (18.11.2026): a slow card is logged here with its phases; a platform timeout with no such line and
    // a short total here did not spend its time in this handler.
    console.warn(`api/card: slow card (${phases}) (${url.search.slice(0, 200)})`);
  }
  const headers = new Headers(result.headers);
  headers.set("Server-Timing", `response;dur=${progress.responseMs ?? 0}, body;dur=${progress.bodyMs ?? 0}, total;dur=${totalMs}`);
  // DEF-015: a share card is a pure function of its query string, and crawlers (WhatsApp, Facebook, Telegram) re-fetch it on every share. Only a
  // successful GET on the canonical origin may be cached at the CDN; protected-review origins and every error stay no-store. How long depends on
  // whether the card reads the database (card-request.js).
  const cacheable = req.method === "GET" && url.origin === CANONICAL_ORIGIN && result.status === 200;
  headers.set("Cache-Control", cacheable ? CARD_CACHE[policy.cacheClass] : "no-store");
  // A cached card can be purged on purpose (a design, brand or font change; content that must disappear at once): tag "api-card" for all,
  // "api-card-number" for the cards that read the database. Whether the CDN keeps entries across deployments is not assumed.
  if (cacheable) headers.set("Vercel-Cache-Tag", `api-card,api-card-${policy.cacheClass}`);
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return new Response(req.method === "HEAD" ? null : result.body, { status: result.status, headers });
}
