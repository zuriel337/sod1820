// contact-notify — the contact form notice to the site owner. Logic in core.js (tested in node). verify_jwt stays false as deployed:
// the form is public and the caller-independent limits in core.js protect the paid provider.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { handle } from "./core.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const serviceRpc = async (name: string, args: unknown) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  return res.ok ? await res.json() : null;
};

Deno.serve((req: Request) => handle(req, {
  resendKey: Deno.env.get("RESEND_API_KEY") ?? "",
  to: Deno.env.get("CONTACT_NOTIFY_TO") ?? "",
  from: Deno.env.get("NOTIFY_FROM") ?? Deno.env.get("NEWSLETTER_FROM") ?? "סוד 1820 <news@sod1820.co.il>",
  secret: SERVICE_KEY,
  serviceRpc,
  fetch,
  log: (...args: unknown[]) => console.error(...args),
}));
