import handler from "../../api/card.js";
import { deploymentAuthorized, PUBLIC_READING_ORIGINS } from "../authorization.js";
export const config = { runtime: "edge" };
export default function publicReadingCard(req) {
  const url = new URL(req.url);
  if (!deploymentAuthorized()) return new Response("unavailable", { status: 503 });
  if (!PUBLIC_READING_ORIGINS.includes(url.origin)) return new Response("unavailable", { status: 421 });
  if (!["GET", "HEAD"].includes(req.method)) return new Response("method not allowed", { status: 405 });
  return handler(req);
}
