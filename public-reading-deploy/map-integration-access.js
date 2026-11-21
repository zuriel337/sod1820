import { createHmac, timingSafeEqual } from "node:crypto";
import { MAP_INTEGRATION_REVIEW_BRANCH } from "./review-admission.js";

const key = "_map_review";
const cookieName = "__Host-map-integration-review";
const maxSeconds = 4 * 60 * 60;

function validTicket(ticket, secret, now) {
  const match = /^(\d{10})\.([a-f0-9]{64})$/.exec(ticket || "");
  if (!match || !/^[a-f0-9]{64}$/.test(secret || "")) return false;
  const expires = Number(match[1]);
  if (expires <= now || expires > now + maxSeconds) return false;
  const expected = createHmac("sha256", secret).update(match[1]).digest();
  return timingSafeEqual(expected, Buffer.from(match[2], "hex"));
}

// The existing Vercel project has no SSO protection. Only this exact Preview
// branch requires a short-lived access ticket before serving its document.
export function mapIntegrationAccess(req, res, url, env = process.env, now = Math.floor(Date.now() / 1000)) {
  if (env.VERCEL_ENV !== "preview" || env.VERCEL_GIT_COMMIT_REF !== MAP_INTEGRATION_REVIEW_BRANCH) return false;
  const secret = env.MAP_INTEGRATION_REVIEW_ACCESS_KEY;
  const supplied = url?.searchParams.get(key) || req.query?.[key];
  const cookie = String(req.headers?.cookie || "").split(";").map(part => part.trim())
    .find(part => part.startsWith(cookieName + "="))?.slice(cookieName.length + 1);
  res.setHeader("Referrer-Policy", "no-referrer");
  if (typeof supplied === "string" && validTicket(supplied, secret, now)) {
    const remaining = Number(supplied.split(".")[0]) - now;
    res.setHeader("Set-Cookie", `${cookieName}=${supplied}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${remaining}`);
    res.setHeader("Location", "/");
    res.status(303).send("");
    return true;
  }
  if (validTicket(cookie, secret, now)) return false;
  res.status(403).send("This integration preview requires its review link.");
  return true;
}
