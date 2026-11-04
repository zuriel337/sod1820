import handler from "../../api/card.js";
import { deploymentAuthorized, publicReadingOriginAllowed } from "../authorization.js";
export const config = { runtime: "edge" };
export default async function publicReadingCard(req) {
  const url = new URL(req.url);
  if (!deploymentAuthorized()) return new Response("unavailable", { status: 503 });
  if (!publicReadingOriginAllowed(url.origin)) return new Response("unavailable", { status: 421 });
  if (!["GET", "HEAD"].includes(req.method)) return new Response("method not allowed", { status: 405 });
  const result = await handler(req);
  const headers = new Headers(result.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return new Response(req.method === "HEAD" ? null : result.body, { status: result.status, headers });
}
