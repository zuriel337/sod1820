// 📿 wa-process — מנוע העיבוד-העמוק לבוט הוואטסאפ. pg_cron קורא לכאן פעם בדקה.
// לוקח ממתינים מ-wa_deep_queue → מחשב בכל השיטות → מוצא התכנסויות (אותה שיטה + חוצה-שיטות)
// → שולח תשובה עמוקה מצוטטת → מוסיף למאגר → מסמן done. הכל מאומת במנוע.
import { createClient } from "jsr:@supabase/supabase-js@2";

const SECRET = "s0d1820wahook_7yq2c9";
const SIGN = "⚙️ מאומת במנוע · sod1820";
const SENSITIVE = /(נדקר|נרצח|נהרג|הרוג|רצח|פיגוע|טרור|מוות|נפטר|אסון|שריפ|דקיר|מת\b)/;
const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
const clean = (s: string) => (s || "").replace(/[֑-ׇ]/g, "").replace(/[^א-ת\s]/g, " ").replace(/\s+/g, " ").trim();

async function calc(fn: string, phrase: string) {
  // שמות הארגומנטים במנוע: fn_ragil/fn_misratar/fn_albam → phrase · השאר → p
  const usesPhrase = fn === "fn_ragil" || fn === "fn_misratar" || fn === "fn_albam";
  const { data, error } = await sb.rpc(fn, usesPhrase ? { phrase } : { p: phrase });
  return error ? 0 : (Number(data) || 0);
}

Deno.serve(async (req) => {
  if (new URL(req.url).searchParams.get("s") !== SECRET) return new Response("forbidden", { status: 403 });
  const { data: rows } = await sb.from("wa_deep_queue").select("*").eq("status", "pending").order("created_at").limit(6);
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
      await sb.rpc("wa_add_word", { p_phrase: phrase, p_source: "wa-deep", p_note: row.sender_name ? "מאת " + row.sender_name : null });
      await sb.from("wa_deep_queue").update({ status: "done", processed_at: new Date().toISOString() }).eq("id", row.id);
      done++;
    } catch {
      await sb.from("wa_deep_queue").update({ status: "error", processed_at: new Date().toISOString() }).eq("id", row.id);
    }
  }
  return new Response(JSON.stringify({ processed: done }), { headers: { "Content-Type": "application/json" } });
});
