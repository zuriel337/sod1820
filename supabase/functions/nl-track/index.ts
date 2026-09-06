// nl-track — canonical per-recipient newsletter tracking endpoint.
// EXTEND_EXISTING only. Public token endpoint (verify_jwt=false); random tokens expose no PII.
// Legacy compatibility: subscriber-token links remain resolvable.
// v2: newsletter_sends.token (per-send) is resolved first; subscribers.token is fallback only.
// e=open -> first-open timestamp + 1x1 GIF.
// m=click&u=<safe sod1820 URL> -> first-click timestamp + redirect.
// default resolve -> soft identity JSON; inactive legacy subscriber may reactivate on intentional resolve click.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", ...CORS } });
const GIF = Uint8Array.from(atob("R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="), (c) => c.charCodeAt(0));
const pixel = () => new Response(GIF, { headers: { "content-type": "image/gif", "cache-control": "no-store, max-age=0", ...CORS } });

function safeTarget(raw: string | null) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const h = u.hostname.toLowerCase();
    if (h !== "sod1820.co.il" && h !== "www.sod1820.co.il") return null;
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const url = new URL(req.url);
    const token = (url.searchParams.get("t") || "").trim();
    const campaign = (url.searchParams.get("c") || "").trim();
    const isOpen = url.searchParams.get("e") === "open";
    const isClick = url.searchParams.get("m") === "click";
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (!token || token.length > 200) {
      if (isClick) return Response.redirect(safeTarget(url.searchParams.get("u")) || "https://sod1820.co.il", 302);
      return isOpen ? pixel() : json({ ok: false }, 400);
    }

    // v2 primary identity: the specific send row.
    const { data: send } = await admin.from("newsletter_sends")
      .select("id,email,campaign,source")
      .eq("token", token)
      .maybeSingle();

    let email = send?.email || null;
    let sendId = send?.id || null;
    let sendCampaign = send?.campaign || campaign || null;

    // Legacy fallback: old nl-track links used the stable subscribers.token.
    let subscriber: { email: string; source: string | null; active: boolean; name: string | null } | null = null;
    if (!email) {
      const { data: sub } = await admin.from("subscribers")
        .select("email,source,active,name")
        .eq("token", token)
        .maybeSingle();
      subscriber = sub || null;
      email = subscriber?.email || null;
      if (email && campaign) {
        const { data: legacySend } = await admin.from("newsletter_sends")
          .select("id,campaign")
          .eq("campaign", campaign)
          .eq("email", email)
          .maybeSingle();
        sendId = legacySend?.id || null;
        sendCampaign = legacySend?.campaign || campaign;
      }
    }

    if (isOpen) {
      if (sendId) await admin.from("newsletter_sends").update({ status: "opened", opened_at: new Date().toISOString() }).eq("id", sendId).is("opened_at", null);
      return pixel();
    }

    if (isClick) {
      const target = safeTarget(url.searchParams.get("u"));
      if (sendId) await admin.from("newsletter_sends").update({ status: "clicked", clicked_at: new Date().toISOString() }).eq("id", sendId).is("clicked_at", null);
      return Response.redirect(target || "https://sod1820.co.il", 302);
    }

    if (!email) return json({ ok: false }, 404);
    if (!subscriber) {
      const { data: sub } = await admin.from("subscribers").select("email,source,active,name").eq("email", email).maybeSingle();
      subscriber = sub || null;
    }
    if (!subscriber) return json({ ok: false }, 404);

    // Legacy soft-identity behavior retained for explicit resolve flows only.
    const reactivated = !subscriber.active;
    if (reactivated) await admin.from("subscribers").update({ active: true, unsubscribed_at: null }).eq("email", email);
    if (sendId) await admin.from("newsletter_sends").update({ status: "clicked", clicked_at: new Date().toISOString() }).eq("id", sendId).is("clicked_at", null);

    return json({ ok: true, source: subscriber.source, reactivated, name: subscriber.name || null, campaign: sendCampaign });
  } catch (e) {
    return json({ ok: false, error: String(e).slice(0, 120) }, 500);
  }
});