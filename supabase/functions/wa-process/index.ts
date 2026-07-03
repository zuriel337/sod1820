// 📿 wa-process — מנוע העיבוד-העמוק לבוט הוואטסאפ. pg_cron קורא לכאן פעם בדקה.
// לוקח ממתינים מ-wa_deep_queue → מחשב בכל השיטות → מוצא התכנסויות (אותה שיטה + חוצה-שיטות)
// → שולח תשובה עמוקה מצוטטת → מוסיף למאגר → מסמן done. הכל מאומת במנוע.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = "s0d1820wahook_7yq2c9";
const SIGN = "🔯 רזיאל · מאומת במנוע · sod1820";
const SENSITIVE = /(נדקר|נרצח|נהרג|הרוג|רצח|פיגוע|טרור|מוות|נפטר|אסון|שריפ|דקיר|מת\b)/;
const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const clean = (s: string) => (s || "").replace(/[֑-ׇ]/g, "").replace(/[^א-ת\s]/g, " ").replace(/\s+/g, " ").trim();
// חילוץ כל הביטויים העבריים מהודעה מלאה (שורות/פסיקים/= וכו') — לנתיב-VIP, כדי לא לאבד שום גימטריה.
function extractPhrases(t: string): string[] {
  const parts = (t || "").split(/[\n,;=·|•\-–—:()"'".!?׃־]+/);
  const out: string[] = [];
  for (const raw of parts) {
    const c = clean(raw); if (!c) continue;
    const w = c.split(" ").filter(Boolean);
    if (c.length >= 2 && c.length <= 40 && w.length >= 1 && w.length <= 6) out.push(c);
  }
  return [...new Set(out)].slice(0, 15);
}

// 🧹 שער-איכות (quality gate — בקשת צוריאל 3.7): מונע כניסת רעש-צ׳אט למאגר.
// מסנן: מילות-מטא ("בגימטריא"/"כלומר"…), פותחי/מחברי-משפט ("וגם"…), שברי-רעש ("חח"/"תודה"),
// ומשפטים (5+ מילים). ביטויי-גימטריה אמיתיים הם קצרים (שם/צירוף), לא משפטי-שיחה.
const META_RE = /(גימטרי|בגימ|כלומר|וכדומה|השאלה|שמצאתי|נכתב|סרטון|אנגלית|תודה|הביאה חידוש|מופיע ב|יקר שלי|יפה שאתה|רואים את|לפני עשור)/;
const FILLER = new Set(["וגם", "וכו", "וכדומה", "כלומר", "נכון", "לגבי", "אבל"]);
const NOISE = new Set(["חח", "חחח", "חחחח", "ההה", "לול", "אמ", "מם", "בה", "הה"]);
function isQualityPhrase(p: string): boolean {
  const c = clean(p);
  if (!c) return false;
  const words = c.split(" ").filter(Boolean);
  const bare = c.replace(/\s+/g, "");
  if (bare.length < 2) return false;                              // קצר מדי (אות בודדת)
  if (words.length > 4) return false;                             // משפט, לא ביטוי
  if (NOISE.has(bare) || words.some((w) => NOISE.has(w))) return false;   // רעש-שיחה
  if (META_RE.test(c)) return false;                             // מילת-מטא/צ׳אט
  if (FILLER.has(words[0]) || words.some((w) => w === "וגם")) return false; // פותח/מחבר-משפט
  return true;
}

// 🔤 צמד-תעתוק (שיטת שמעון: אנגלית→עברית→גימטריה). תופס שורה עם "=" יחיד שבצד אחד עברית
// ובצד השני מילה לטינית אחת בלבד ("Realize = ריאלז" · "דרים= dream"). עמום (עברית+לטינית באותו צד) → דלג.
function extractLatinPairs(t: string): { he: string; en: string }[] {
  const pairs: { he: string; en: string }[] = [];
  for (const line of (t || "").split(/\n+/)) {
    const eq = line.split("=");
    if (eq.length !== 2) continue;
    const [a, b] = eq;
    const heA = clean(a), heB = clean(b);
    const enA = (a.match(/[A-Za-z][A-Za-z' ]*[A-Za-z]|[A-Za-z]/g) || []).map((s) => s.trim().toLowerCase()).filter((s) => s.length >= 2);
    const enB = (b.match(/[A-Za-z][A-Za-z' ]*[A-Za-z]|[A-Za-z]/g) || []).map((s) => s.trim().toLowerCase()).filter((s) => s.length >= 2);
    let he = "", en = "";
    if (heA && !heB && enB.length === 1 && !enA.length) { he = heA; en = enB[0]; }        // עברית = אנגלית
    else if (heB && !heA && enA.length === 1 && !enB.length) { he = heB; en = enA[0]; }    // אנגלית = עברית
    else continue;
    const w = he.split(" ").filter(Boolean);
    if (w.length < 1 || w.length > 4) continue;
    pairs.push({ he, en });
  }
  return pairs;
}

async function calc(fn: string, phrase: string) {
  // שמות הארגומנטים במנוע: fn_ragil/fn_misratar/fn_albam → phrase · השאר → p
  const usesPhrase = fn === "fn_ragil" || fn === "fn_misratar" || fn === "fn_albam";
  const { data, error } = await sb.rpc(fn, usesPhrase ? { phrase } : { p: phrase });
  return error ? 0 : (Number(data) || 0);
}

Deno.serve(async (req) => {
  if (new URL(req.url).searchParams.get("s") !== SECRET) return new Response("forbidden", { status: 403 });
  const { data: rows } = await sb.from("wa_deep_queue").select("*").eq("status", "pending").order("created_at").limit(6);
  // 👑 אנשי-זהב — רק תוכן איכותי *שלהם* (התכנסות אמיתית) זורם לערוץ torat-haremez באתר.
  const { data: vips } = await sb.from("wa_vip_senders").select("sender,name_match").eq("active", true);
  const isVipSender = (sender: string, name: string) => (vips || []).some((v: { sender?: string; name_match?: string }) =>
    (v.sender && (sender || "").startsWith(v.sender)) || (v.name_match && (name || "").includes(v.name_match)));
  let done = 0;
  for (const row of (rows || [])) {
    try {
      const phrase = row.phrase as string;
      const ragil = await calc("fn_ragil", phrase);
      if (ragil <= 0) { await sb.from("wa_deep_queue").update({ status: "error", processed_at: new Date().toISOString() }).eq("id", row.id); continue; }
      const [siduri, atbash, gadol, kadmi] = await Promise.all([
        calc("fn_siduri", phrase), calc("fn_atbash", phrase), calc("fn_gadol", phrase), calc("fn_kadmi", phrase),
      ]);
      const methods = [
        { label: "רגיל", val: ragil, cross: false },
        { label: "סידורי", val: siduri, cross: true },
        { label: "אתבש", val: atbash, cross: true },
        { label: "גדול", val: gadol, cross: true },
        { label: "קדמי", val: kadmi, cross: true },
      ];
      const vals = [...new Set(methods.map((m) => m.val).filter((v) => v > 0))];
      const { data: hits } = await sb.from("gematria_words").select("phrase,ragil").in("ragil", vals).limit(120);
      const self = clean(phrase);
      const byVal = new Map<number, string[]>();
      for (const h of (hits || [])) {
        const p = (h as { phrase: string }).phrase || ""; const v = (h as { ragil: number }).ragil;
        if (!p || SENSITIVE.test(p) || clean(p) === self) continue;
        const arr = byVal.get(v) || []; if (arr.length < 4 && !arr.some((x) => clean(x) === clean(p))) { arr.push(p); byVal.set(v, arr); }
      }
      const strong = byVal.get(ragil) || [];
      const strongLine = strong.length ? `\n📊 *רגיל ${ragil}* = ${strong.map((p) => `*${p}*`).join(" = ")}` : `\n📊 רגיל = ${ragil}`;
      const crossLines: string[] = [];
      for (const m of methods.filter((x) => x.cross)) {
        const arr = byVal.get(m.val);
        if (arr && arr.length) crossLines.push(`🔀 ב*${m.label}* = ${m.val} → ברגיל: ${arr.slice(0, 3).map((p) => `*${p}*`).join(" · ")}`);
      }
      const cross = crossLines.length ? "\n" + crossLines.join("\n") : "";
      const msg = `📿 העמקה על *${phrase}*${strongLine}${cross}\n\n*עובדה:* הכל חושב במנוע. *רמז:* פרשנות משלימה, לא עובדה.\n${SIGN}`;

      await sb.rpc("wa_admin", { p_method: "sendMessage", p_payload: { chatId: row.chat_id, message: msg, quotedMessageId: row.msg_id }, p_http: "POST" });

      const vip = isVipSender(row.sender as string, row.sender_name as string);
      const who = row.sender_name ? String(row.sender_name) : null;
      if (vip) {
        // 👑 נתיב-זהב: מחלצים ביטויים מההודעה — אך *רק ביטויי-איכות* (שער isQualityPhrase) נכנסים למאגר.
        const phrases = extractPhrases((row.raw_text as string) || phrase).filter(isQualityPhrase);
        if (isQualityPhrase(phrase) && !phrases.includes(phrase)) phrases.unshift(phrase);
        for (const p of phrases.slice(0, 15)) { try { await sb.rpc("wa_add_vip_word", { p_phrase: p, p_vip: who, p_note: who ? "מאת " + who : null }); } catch { /* noop */ } }
        try { await sb.from("wa_vip_inbox").update({ phrases }).eq("msg_id", row.msg_id); } catch { /* noop */ }
      } else if (isQualityPhrase(phrase)) {
        await sb.rpc("wa_add_word", { p_phrase: phrase, p_source: "wa-deep", p_note: who ? "מאת " + who : null });
      }

      // 🔤 תעתוק אנגלית → שכבת הכינויים (word_aliases): כל מילה לטינית נצמדת כ-alias לישות העברית. עץ אחד.
      // method=transliteration (שומר את הערך העברי) · confidence 0.9 (אוטומטי) · verified=false עד סקירה.
      for (const { he, en } of extractLatinPairs((row.raw_text as string) || phrase)) {
        try { await sb.rpc("add_word_alias", { p_phrase: he, p_alias: en, p_lang: "en", p_type: "english", p_source: "wa-vip", p_method: "transliteration", p_confidence: 0.9, p_verified: false }); } catch { /* noop */ }
      }

      // 📡 זרימה לערוץ האתר — רק אנשי-זהב + התכנסות אמיתית (strong≥1). דדופ 7 ימים.
      if (strong.length >= 1 && vip) {
        const chText = `🔯 *${phrase}* = *${ragil}* = ${strong.map((p) => `*${p}*`).join(" = ")}`;
        const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
        const { data: exist } = await sb.from("channel_updates").select("id")
          .eq("channel", "torat-haremez").eq("text", chText).gte("created_at", weekAgo).maybeSingle();
        if (!exist) {
          await sb.from("channel_updates").insert({
            channel: "torat-haremez", text: chText, source: "wa-vip",
            credit: row.sender_name ? String(row.sender_name) : null,
            link_url: `/number/${ragil}`, priority: 90,
          });
        }
      }

      await sb.from("wa_deep_queue").update({ status: "done", processed_at: new Date().toISOString() }).eq("id", row.id);
      done++;
    } catch {
      await sb.from("wa_deep_queue").update({ status: "error", processed_at: new Date().toISOString() }).eq("id", row.id);
    }
  }
  return new Response(JSON.stringify({ processed: done }), { headers: { "Content-Type": "application/json" } });
});
