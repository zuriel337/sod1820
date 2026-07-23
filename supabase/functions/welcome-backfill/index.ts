// ✉️ welcome-backfill — שליחת מייל-הפתיחה (newsletter_welcome) חד-פעמית לרשימה שנרשמה לפני שהאוטומציה עלתה.
// נשלח *בדיוק כמו שהוא* — כולל השורה «זהו מייל הפתיחה היחיד שתקבלו» (בכוונת צוריאל: מייל מיוחד לשמירה).
// מצבים: ?mode=test&to=<email> (שליחה בודדת לבדיקה) · ?mode=send (סגמנט «חם»: נרשמי-אתר פעילים שטרם קיבלו).
// גישה: סוד ?s=<WBF_SECRET>. verify_jwt=false. שולח RAW (התוכן מייל שלם), רושם email_events(sent) + newsletter_campaigns.

const SITE = "https://sod1820.co.il";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("NEWSLETTER_FROM") ?? "סוד 1820 <news@sod1820.co.il>";
const HMAC_SECRET = Deno.env.get("NEWSLETTER_SECRET") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GATE = Deno.env.get("WBF_SECRET") ?? "wbf_2026_k7m3q9";

const b64url = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmac(email: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(HMAC_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(email));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json; charset=utf-8" } });

async function sendOne(url: string, key: string, subject: string, tmpl: string, email: string, logSent: boolean) {
  const eb = b64url(email);
  const t = await hmac(email);
  const siteUnsub = `${SITE}/unsubscribe?e=${eb}&t=${t}`;
  const edgeUnsub = `${url}/functions/v1/newsletter-unsubscribe?e=${eb}&t=${t}`;
  const openPixel = `${url}/functions/v1/email-open?c=welcome&e=${eb}`;
  const html = tmpl.replaceAll("{{UNSUB}}", siteUnsub).replaceAll("{{OPEN}}", openPixel);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM, to: email, subject,
      html,
      headers: { "List-Unsubscribe": `<${edgeUnsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
  });
  const ok = r.ok;
  if (ok && logSent) {
    try {
      await fetch(`${url}/rest/v1/email_events`, {
        method: "POST",
        headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", prefer: "return=minimal" },
        body: JSON.stringify({ email, campaign: "welcome", event: "sent" }),
      });
    } catch { /* לא קריטי */ }
  }
  return ok;
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (u.searchParams.get("s") !== GATE) return json({ error: "forbidden" }, 403);
  const mode = u.searchParams.get("mode") || "test";
  if (!RESEND_KEY) return json({ error: "no RESEND_API_KEY" }, 500);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // תבנית: newsletter_welcome active — נשלחת בדיוק כמו שהיא (מייל-פתיחה מיוחד לשמירה)
  const wr = await fetch(`${url}/rest/v1/newsletter_welcome?active=eq.true&select=subject,html&limit=1`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  const w = (wr.ok ? await wr.json() : [])?.[0];
  if (!w?.html) return json({ error: "no active welcome template" }, 500);
  const subject = w.subject || "ברוכים הבאים לסוד 1820";
  const tmpl = String(w.html); // בדיוק כמו שהוא — בלי שינוי בתוכן

  if (mode === "test") {
    const to = (u.searchParams.get("to") || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(to)) return json({ error: "bad 'to'" }, 400);
    const ok = await sendOne(url, key, subject, tmpl, to, false); // בדיקה — לא רושמים sent
    return json({ mode, to, sent: ok });
  }

  if (mode === "send") {
    // סגמנט «חם»: נרשמי-אתר פעילים (לא mailpoet), שטרם קיבלו welcome (לא ב-email_events sent)
    const already = new Set<string>();
    const er = await fetch(`${url}/rest/v1/email_events?campaign=eq.welcome&event=eq.sent&select=email`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
    });
    if (er.ok) for (const row of await er.json()) already.add(String(row.email).toLowerCase());

    const sr = await fetch(`${url}/rest/v1/subscribers?active=eq.true&source=not.ilike.mailpoet*&select=email&limit=1000`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
    });
    const rows = sr.ok ? await sr.json() : [];
    const targets = [...new Set(rows.map((r: { email: string }) => String(r.email).toLowerCase()))]
      .filter(e => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(e) && !already.has(e));

    const dry = u.searchParams.get("dry") === "1";
    if (dry) return json({ mode, dry: true, would_send: targets.length, sample: targets.slice(0, 5) });

    let sent = 0, failed = 0;
    for (const e of targets) {
      const ok = await sendOne(url, key, subject, tmpl, e, true);
      if (ok) sent++; else failed++;
      await new Promise(res => setTimeout(res, 120)); // ~8/שנייה — עדין ל-Resend/מוניטין
    }
    // רישום קמפיין
    try {
      await fetch(`${url}/rest/v1/newsletter_campaigns`, {
        method: "POST",
        headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", prefer: "return=minimal" },
        body: JSON.stringify({ subject, segment_source: "welcome-backfill (warm)", recipients: targets.length, sent, failed, status: "sent" }),
      });
    } catch { /* לא קריטי */ }
    return json({ mode, recipients: targets.length, sent, failed });
  }

  return json({ error: "bad mode" }, 400);
});
