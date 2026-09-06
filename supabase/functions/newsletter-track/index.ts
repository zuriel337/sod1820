// newsletter-track — per-recipient tracking for future newsletter_sends rows.
// PRODUCT_TRAFFIC_FORWARD_ATTRIBUTION_CLOSURE_V1 (Human-Gate ZURIEL 2026-09-07).
// Reuses newsletter_sends; no new table/store. Public token endpoint: token is random and exposes no PII.
// m=open  -> marks opened_at (first open only) and returns a 1x1 GIF.
// m=click -> marks clicked_at (first click only) and redirects only to sod1820.co.il targets.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const GIF = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="),
  (c) => c.charCodeAt(0),
);

function pixel() {
  return new Response(GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

function safeTarget(raw: string | null) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const h = u.hostname.toLowerCase();
    if (h !== "sod1820.co.il" && h !== "www.sod1820.co.il") return null;
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const u = new URL(req.url);
    const token = (u.searchParams.get("t") || "").trim();
    const mode = (u.searchParams.get("m") || "open").toLowerCase();
    if (!token || token.length > 200) return mode === "click" ? Response.redirect("https://sod1820.co.il", 302) : pixel();

    // Token existence is deliberately not disclosed. Invalid tokens get the same response shape.
    const { data: row } = await admin.from("newsletter_sends").select("id").eq("token", token).maybeSingle();
    if (!row?.id) return mode === "click" ? Response.redirect(safeTarget(u.searchParams.get("u")) || "https://sod1820.co.il", 302) : pixel();

    if (mode === "click") {
      const target = safeTarget(u.searchParams.get("u"));
      if (!target) return Response.redirect("https://sod1820.co.il", 302);
      await admin.from("newsletter_sends").update({ clicked_at: new Date().toISOString() }).eq("id", row.id).is("clicked_at", null);
      return Response.redirect(target, 302);
    }

    await admin.from("newsletter_sends").update({ opened_at: new Date().toISOString() }).eq("id", row.id).is("opened_at", null);
    return pixel();
  } catch {
    return pixel();
  }
});
