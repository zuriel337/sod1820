// 🧭 מרכז הפיקוד — עדשות-לקוח לשלב 1+2 (personal_command_center_law).
// «עץ אחד»: נבנה על נתונים קיימים (visitor_events / research_items / getForumFeed / profiles),
// בלי טבלאות/מערכות מקבילות. הכל beta — הקרדיטים בהרצה.
import { supabase } from "./supabase.js";
import { getVisitorId } from "./tracking.js";
import { getForumFeed } from "./contributions.js";

// 💰 הפרופיל+יתרת-הקרדיטים של המשתמש (RLS: כל אחד רואה רק את שלו). null אם אין עדיין רשומה.
export async function getMyProfile() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.from("profiles").select("credits,xp,level,tier,streak").maybeSingle();
    return data || null;
  } catch { return null; }
}

// 🎁 תביעת מענקי-מייסד ממתינים לפי המייל המאומת (idempotent). מחזיר את הסכום שנוסף (0 אם אין).
export async function claimFoundingGrants() {
  if (!supabase) return 0;
  try { const { data } = await supabase.rpc("claim_my_founding_grants"); return data || 0; } catch { return 0; }
}

// ☀️ קרדיט יומי (חד-פעמי ליום UTC). מחזיר {ok, awarded, already?}. נקרא בפתיחת האזור-האישי.
export async function claimDailyCredit() {
  if (!supabase) return { ok: false, awarded: 0 };
  try { const { data } = await supabase.rpc("claim_daily_credit"); return data || { ok: false, awarded: 0 }; } catch { return { ok: false, awarded: 0 }; }
}

// 💬 קרדיטים על הודעות בקבוצות הוואטסאפ (wa_bot_log). idempotent — מונה פר-טלפון. מחזיר {ok, awarded}.
export async function claimWaActivityCredits() {
  if (!supabase) return { ok: false, awarded: 0 };
  try { const { data } = await supabase.rpc("claim_wa_activity_credits"); return data || { ok: false, awarded: 0 }; } catch { return { ok: false, awarded: 0 }; }
}

// 🧠 «מה כדאי לי לעשות עכשיו?» — עד 3 פעולות, מנתונים קיימים בלבד (בלי RPC חדש).
// module → פותח מודול במגירה · link → ניווט. center = תוצאת my_center שכבר נטענה.
export async function getNextActions({ center } = {}) {
  const out = [];
  const vid = (() => { try { return getVisitorId(); } catch { return null; } })();

  // 1) המשך מהמקום שעצרת — הישות האחרונה שנחקרה (visitor_events לפי visitor_id)
  if (supabase && vid) {
    try {
      const { data } = await supabase.from("visitor_events")
        .select("section,slug,created_at")
        .eq("visitor_id", vid).in("section", ["number", "beit-midrash", "research"])
        .not("slug", "is", null).order("created_at", { ascending: false }).limit(1);
      const e = data && data[0];
      if (e && e.slug) {
        const link = e.section === "number" ? `/number/${encodeURIComponent(e.slug)}`
          : e.section === "beit-midrash" ? "/beit-midrash" : "/research";
        out.push({ icon: "↩️", text: `המשך מהמקום שעצרת — «${e.slug}»`, cta: "פתח", link });
      }
    } catch { /* noop */ }
  }

  // 1.5) אונבורדינג לסוכן האישי — חבר וואטסאפ (רק אם מחובר-חשבון ואין עדיין טלפון מקושר).
  // פעולה חד-פעמית: נעלמת ברגע שמחברים. מזינה את «עולם הסוכן האישי».
  try {
    const linked = await getMyLinkedPhones();
    if (Array.isArray(linked) && linked.length === 0) {
      out.push({ icon: "🟢", text: "חבר את הוואטסאפ שלך — כדי שהסוכן האישי יזהה אותך", cta: "לחיבור", module: "whatsapp" });
    }
  } catch { /* noop */ }

  // 2) מחקר פעיל (מ-my_center שכבר נטען)
  if ((center?.research_items ?? 0) > 0) {
    out.push({ icon: "🔬", text: `יש לך ${center.research_items} פריטים במחקר הפעיל`, cta: "למחקר שלי", module: "research" });
  }

  // 3) חדש בקהילה — הפריט האחרון בפורום (מצביע, לא משכפל)
  try {
    const feed = await getForumFeed({ limit: 1 });
    const f = feed && feed[0];
    if (f) {
      const title = (f.title || (f.body || "").slice(0, 60)).trim();
      const link = f.kind === "post" ? `/${f.slug}` : "/forum";
      out.push({ icon: "🆕", text: `חדש בקהילה: ${title.length > 54 ? title.slice(0, 54) + "…" : title}`, cta: "לצפייה", link });
    }
  } catch { /* noop */ }

  return out.slice(0, 3);
}

// 🤖 רוסטר-הצוות מ-agent_identity (public read · agents_team_law v2). מטטרון(orchestrator) ראשון.
export async function getAgentRoster() {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("agent_identity")
      .select("agent_id,name,role,layer,domain,phase,user_facing").eq("active", true);
    return data || [];
  } catch { return []; }
}

// 📈 «מה הסוכן למד» — agent_research_stats (מיושר ל-4 השכבות). מקובץ בצד-לקוח לפי agent.
export async function getAgentStats() {
  if (!supabase) return {};
  try {
    const { data } = await supabase.from("agent_research_stats")
      .select("agent,metric_key,label,value,detail,sort").order("sort", { ascending: true });
    const by = {};
    (data || []).forEach(r => { (by[r.agent] = by[r.agent] || []).push(r); });
    return by;
  } catch { return {}; }
}

// 🧠 הזיכרון שלי מול הבוטים — agent_user_memory (RLS own-read: רק השורות שלי). פרטיות = הלב.
export async function getMyAgentMemory(limit = 20) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("agent_user_memory")
      .select("id,agent,topic,content,memory_type,visibility,created_at")
      .order("created_at", { ascending: false }).limit(limit);
    return data || [];
  } catch { return []; }
}

// ◆ ספר-הקרדיטים שלי — credit_ledger (RLS owner-read).
export async function getMyCreditLedger(limit = 15) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("credit_ledger")
      .select("amount,reason,meta,created_at").order("created_at", { ascending: false }).limit(limit);
    return data || [];
  } catch { return []; }
}

// 🔗 הטלפונים המקושרים לחשבון שלי (RLS owner-read על wa_account_links).
export async function getMyLinkedPhones() {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("wa_account_links")
      .select("phone,verified_at").order("verified_at", { ascending: false });
    return data || [];
  } catch { return []; }
}

// 🔐 בקשת קוד-אימות בוואטסאפ למספר שהמשתמש הזין (השרת שולח דרך wa_send).
// מחזיר {ok, sent?, already_linked?, masked?, error?}.
export async function requestWaLinkCode(phone) {
  if (!supabase) return { ok: false, error: "no_client" };
  try {
    const { data, error } = await supabase.rpc("request_wa_link_code", { p_phone: phone });
    if (error) return { ok: false, error: error.message };
    return data || { ok: false, error: "empty" };
  } catch (e) { return { ok: false, error: String(e?.message || e) }; }
}

// ✂️ ניתוק-עצמי של טלפון מקושר שלי.
export async function unlinkMyWa(phone) {
  if (!supabase) return { ok: false, error: "no_client" };
  try {
    const { data, error } = await supabase.rpc("unlink_my_wa", { p_phone: phone });
    if (error) return { ok: false, error: error.message };
    return data || { ok: false };
  } catch (e) { return { ok: false, error: String(e?.message || e) }; }
}

// ✅ אימות הקוד → יוצר קישור user_id↔phone. מחזיר {ok, linked?, phone?, error?}.
export async function verifyWaLinkCode(phone, code) {
  if (!supabase) return { ok: false, error: "no_client" };
  try {
    const { data, error } = await supabase.rpc("verify_wa_link_code", { p_phone: phone, p_code: code });
    if (error) return { ok: false, error: error.message };
    return data || { ok: false, error: "empty" };
  } catch (e) { return { ok: false, error: String(e?.message || e) }; }
}

// 🧠 הזיכרון שהבוטים צברו על הטלפון המקושר שלי (עדשת get_my_wa_memory — join דרך wa_account_links).
// עדיף על getMyAgentMemory כי user_ref הוא טלפון, לא auth.uid.
export async function getMyWaMemory(limit = 30) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.rpc("get_my_wa_memory", { p_limit: limit });
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
