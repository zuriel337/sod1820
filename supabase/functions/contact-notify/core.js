// contact-notify core — the contact form's e-mail notice to the site owner (M0-E, 12.11.2026).
// Brought into the repository from the deployed v1 (which had no source here, no caller limit and a hard-coded recipient).
// Behaviour kept: same input validation, same HTML escaping, same provider call, same response shapes.
// Added: the recipient comes from the server environment (CONTACT_NOTIFY_TO), and every send passes two atomic buckets of the
// existing limiter (edge_rate_limit_check via _shared/edgeCallerLimits.js): per platform client address and global. A paid e-mail
// send fails CLOSED when the limiter is unavailable. No new limiter, store or contract.
import { checkBucket, limiterKey, platformClientIp } from "../_shared/edgeCallerLimits.js";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
export const LIMITS = Object.freeze({ perAddressPerHour: 5, globalPerHour: 30 });

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...CORS, ...extra } });
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function handle(req, deps) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!deps.resendKey || !deps.to) return json({ error: "email_not_configured" }, 503);

  let body;
  try { body = await req.json(); } catch { return json({ error: "invalid_input" }, 400); }
  const name = String(body?.name ?? "גולש").trim().slice(0, 120) || "גולש";
  const email = String(body?.email ?? "").trim().slice(0, 254);
  const subject = String(body?.subject ?? "פנייה מהאתר").trim().slice(0, 200) || "פנייה מהאתר";
  const message = String(body?.message ?? "").trim().slice(0, 8000);
  if (!message || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "invalid_input" }, 400);

  // Limits before any paid call. Fail closed: no key, no limiter answer -> no e-mail.
  const address = platformClientIp(req) || "unknown";
  const ownKey = await limiterKey(deps.secret, "contact-notify", "address", address);
  const own = await checkBucket(deps.serviceRpc, ownKey, 3600, LIMITS.perAddressPerHour);
  if (own.state === "denied") return json({ error: "rate_limited" }, 429, { "Retry-After": String(own.retryAfter || 3600) });
  if (own.state !== "allowed") return json({ error: "rate_limit_unavailable" }, 503);
  const allKey = await limiterKey(deps.secret, "contact-notify", "global");
  const all = await checkBucket(deps.serviceRpc, allKey, 3600, LIMITS.globalPerHour);
  if (all.state === "denied") return json({ error: "rate_limited" }, 429, { "Retry-After": String(all.retryAfter || 3600) });
  if (all.state !== "allowed") return json({ error: "rate_limit_unavailable" }, 503);

  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8">
      <h2>פנייה חדשה מטופס האתר SOD1820</h2>
      <p><b>שם:</b> ${esc(name)}</p>
      <p><b>אימייל:</b> <a href="mailto:${esc(email)}">${esc(email)}</a></p>
      <p><b>נושא:</b> ${esc(subject)}</p>
      <hr/><p style="white-space:pre-wrap">${esc(message)}</p>
      <hr/><p><a href="https://sod1820.co.il">sod1820.co.il</a></p>
    </div>`;
  try {
    const sent = await deps.fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${deps.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: deps.from, to: [deps.to], reply_to: email, subject: `[SOD1820 Contact] ${subject}`, html }),
    });
    if (!sent.ok) {
      deps.log?.("contact-notify-resend-failed", sent.status);
      return json({ error: "email_send_failed" }, 502);
    }
    return json({ ok: true });
  } catch (error) {
    deps.log?.("contact-notify-error", String(error).slice(0, 250));
    return json({ error: "internal_error" }, 500);
  }
}
