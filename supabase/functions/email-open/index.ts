// 📧 email-open — public 1x1 open-tracking pixel. Public by design; it only records an open event.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GIF = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), (c) => c.charCodeAt(0));

function decodeEmail(s: string): string {
  try {
    const b = s.replace(/-/g, "+").replace(/_/g, "/");
    return atob(b).slice(0, 120);
  } catch { return ""; }
}

const PIXEL_HEADERS = {
  "Content-Type": "image/gif",
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "Pragma": "no-cache",
  "Expires": "0",
  "Access-Control-Allow-Origin": "*",
};

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const campaign = (u.searchParams.get("c") || "").slice(0, 60) || null;
  const email = decodeEmail(u.searchParams.get("e") || "") || null;
  try {
    if (SUPABASE_URL && SERVICE_KEY) {
      await fetch(`${SUPABASE_URL}/rest/v1/email_events`, {
        method: "POST",
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ email, campaign, event: "open" }),
      });
    }
  } catch { /* tracking must never block the pixel */ }
  return new Response(GIF, { headers: PIXEL_HEADERS });
});
