// 🔬 מערכת תרומות-המחקר (research_contribution_law) — עדשת-לקוח על research_contributions.
// מקור-אמת אחד; כל המשטחים (מחקר-קהילתי בכל דף) הם הקרנות. כתיבה דרך RPC (אוכף מודרציה-לפי-סוג).
import { supabase } from "./supabase.js";

// intent — מה המשתמש רצה לתרום. «תגובה» עולה מיד; השאר דורש אישור.
export const INTENTS = [
  { key: "תגובה", emoji: "💬", label: "תגובה", live: true },
  { key: "חידוש", emoji: "💡", label: "חידושי גולשים" },   // תווית-תצוגה בלבד; המפתח (ערך-DB) נשאר "חידוש"
  { key: "השערה", emoji: "🧩", label: "השערה" },
  { key: "תצפית", emoji: "🔍", label: "תצפית" },
  { key: "מקור",  emoji: "📚", label: "מקור" },
  { key: "שאלה",  emoji: "❓", label: "שאלה" },
  { key: "תיקון", emoji: "🛠", label: "תיקון" },
];
export const intentMeta = k => INTENTS.find(i => i.key === k) || { key: k, emoji: "•", label: k };

// 🌐 מקור-הגדרה קנוני לכל פריט-פורום (getForumFeed) — אימוג'י · תווית-סוג · יעד-עומק.
// ⭐ עמיד-לעתיד (בקשת צוריאל): כל kind חדש שיתווסף לפורום — «ערוץ», «רעיון», או כל דבר —
//    מקבל תצוגה סבירה אוטומטית דרך ה-DEFAULT, בלי לשבור אף רכיב. להגדיר סוג חדש = שורה
//    אחת ב-FORUM_KINDS כאן, וכל המשטחים (רצועת-הפוטר, «מהפורום», עדכונים) מתעדכנים יחד.
export const FORUM_KINDS = {
  cipher:  { em: "🆕", label: "צופן חדש מגולש", href: it => `/codes/${encodeURIComponent(it.slug || "")}` },
  post:    { em: "📜", label: "מאמר", href: it => `/${it.slug || ""}` },
  insight: { em: "💡", label: "חידוש", href: it => it.link || "/research?tool=midrash" },
  channel: { em: "📡", label: "עדכון ערוץ", href: it => it.link || "/broadcasts" },
  idea:    { em: "💡", label: "רעיון", href: () => "/forum" },
  // contribution: אימוג'י/תווית נגזרים מכוונת-התרומה (intent) — ראה forumItemMeta
};
const FORUM_KIND_DEFAULT = { em: "🌐", label: "עדכון מהפורום", href: () => "/forum" };

// נגזרת-תצוגה בטוחה לפריט-פורום יחיד. תמיד מחזירה שדות תקינים (גם לפריט ריק/סוג-לא-מוכר).
export function forumItemMeta(it) {
  if (!it) return { em: "🌐", label: "פורום", href: "/forum", when: null, who: "", text: "" };
  const base = FORUM_KINDS[it.kind] || null;
  const im = intentMeta(it.intent);
  const em = (base && base.em) || im.emoji || "💬";
  const label = (base && base.label) || im.label || FORUM_KIND_DEFAULT.label;
  const hrefFn = (base && base.href) || FORUM_KIND_DEFAULT.href;
  const href = typeof hrefFn === "function" ? hrefFn(it) : (hrefFn || "/forum");
  return {
    em, label, href,
    when: it.ts || it.created_at || it.date || null,   // ⛔ שדה-תאריך אחיד — מונע «Invalid Date»
    who: it.author_name || "חבר הקהילה",
    text: (it.title || it.body || "").toString(),
  };
}

// research_state — מסע-המחקר (לא מודרציה)
export const STATE_META = {
  idea:          { emoji: "🟡", label: "רעיון" },
  discussion:    { emoji: "🔵", label: "בדיון" },
  investigating: { emoji: "🔬", label: "בבדיקה" },
  validated:     { emoji: "🟢", label: "מאושר" },
  canonical:     { emoji: "🏛️", label: "קנוני" },
};
export const stateMeta = s => STATE_META[s] || STATE_META.idea;

// כל התרומות על ישות (RLS מחזירה מאושרים + הממתינים של המשתמש עצמו)
export async function getContributions(targetType, targetId, limit = 120) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("research_contributions")
      .select("id,author_name,author_user_id,intent,origin,research_state,status,target_type,target_id,parent_id,title,body,gematria_claim,reactions,created_at")
      .eq("target_type", targetType).eq("target_id", String(targetId))
      .order("created_at", { ascending: true }).limit(limit);
    return data || [];
  } catch { return []; }
}

// תרומה יחידה לפי id — לעמוד-השרשור בפורום (/forum/:id). RLS: מאושרת גלויה לכולם.
export async function getContributionById(id) {
  if (!supabase || !id) return null;
  try {
    const { data } = await supabase.from("research_contributions")
      .select("id,author_name,author_user_id,intent,origin,research_state,status,target_type,target_id,parent_id,title,body,created_at")
      .eq("id", id).maybeSingle();
    return data || null;
  } catch { return null; }
}

export async function addContribution({ intent, origin, body, targetType, targetId, parentId = null, title = null, gematriaClaim = null, authorName = null }) {
  const { data, error } = await supabase.rpc("add_contribution", {
    p_intent: intent, p_origin: origin, p_body: body,
    p_target_type: targetType, p_target_id: targetId != null ? String(targetId) : null,
    p_parent_id: parentId, p_title: title, p_gematria_claim: gematriaClaim,
    p_author_name: authorName,   // 💬 שם לאנונימי (רשומים — נגזר מהחשבון בשרת)
  });
  if (error) throw error;
  return data; // מזהה התרומה החדשה
}

// 🔗 «מצאתי קשר» — edge ברשת-התרומות + קרדיט-מוניטין
export async function linkContribution({ fromId, targetType, targetId, relation = "related", note = null }) {
  const { data, error } = await supabase.rpc("link_contribution", {
    p_from: fromId, p_target_type: targetType, p_target_id: String(targetId), p_relation: relation, p_note: note,
  });
  if (error) throw error;
  return data;
}
export async function getContributionLinks(fromId) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("contribution_links")
      .select("id,target_type,target_id,relation_type,note").eq("from_contribution_id", fromId);
    return data || [];
  } catch { return []; }
}

// 🌐 הפורום — העדשה הגלובלית: כל התרומות המאושרות מכל האתר (top-level בלבד), החדשות ראשונות.
export async function getForumContributions({ intent = null, limit = 80 } = {}) {
  if (!supabase) return [];
  try {
    let q = supabase.from("research_contributions")
      .select("id,author_name,author_user_id,author_contributor_id,intent,origin,research_state,status,target_type,target_id,title,body,created_at")
      .eq("status", "approved").is("parent_id", null)
      .order("created_at", { ascending: false }).limit(limit);
    if (intent) q = q.eq("intent", intent);
    const { data } = await q;
    return data || [];
  } catch { return []; }
}

// כותבים שאינם כתבים-אישיים — מוחרגים מהפורום (עץ אחד: הזרם של צוריאל חי בדף-הבית,
// «מזכה הרבים» = מדור התחזקות נפרד, «מערכת כי לה׳…» = מנוע-הצלבות, לא אדם).
export const FORUM_EXCLUDE_AUTHORS = ["המערכת", "מזכה הרבים", "מערכת כי לה׳ המלוכה"];
export const FORUM_CONTRIB_INTENTS = ["חידוש", "השערה", "תצפית", "מקור", "שאלה", "תיקון"];

// 🌐 פיד-הפורום המאוחד (החדשים למעלה) — ממזג שני זרמים בלי לשכפל:
//   1. תרומות-מחקר (research_contributions).
//   2. פוסטים של הכתבים בעלי-השם — ככרטיס-מצביע לפוסט הקנוני (/<slug>), לא העתק.
// type: null=הכל · "post"=מאמרי-כתבים בלבד · אחד מ-FORUM_CONTRIB_INTENTS=תרומות מסוג זה בלבד.
// writer: סינון פוסטים לפי שם-כתב (רלוונטי כש-type="post").
// שם-מחבר לחידוש (insights) לפי origin
function insightAuthor(origin) {
  if (origin === "ai") return "בית המדרש · AI";
  if (!origin || origin === "system") return "בית המדרש";
  return origin; // «צוריאל» וכו'
}

export async function getForumFeed({ type = null, writer = null, limit = 80, includePosts = true } = {}) {
  if (!supabase) return [];
  const wantContrib = !type || FORUM_CONTRIB_INTENTS.includes(type);
  // 🌳 עץ אחד — מניעת-כפילות: פוסטים שייכים ל«פעילות האתר» (כל הפוסטים, כולל מערכת), לא לפורום.
  //    includePosts=false → הפורום קהילה-בלבד (חידושים·דיונים·צפני-גולשים·insights), בלי זליגת-פוסטים.
  const wantPosts = includePosts && (!type || type === "post");
  const wantInsights = !type || type === "insight";   // 💡 חידושי בית המדרש (insights)
  const wantCiphers = !type || type === "cipher";     // 🔠 צפני-גולשים (els_records source='community')
  const tasks = [];

  // 🔠 צפני-גולשים — כל צופן שגולש שמר ואושר (published) עולה לפורום ככרטיס-מצביע לעמוד /codes/:slug.
  //    עץ אחד: אותו els_records, לא העתק; הכרטיס פותח את הצופן הקנוני עם המחקר הקהילתי שעליו.
  if (wantCiphers) {
    const q = supabase.from("els_records")
      .select("id,slug,title,search_term,skip_distance,scope,image_url,description,author_name,created_at")
      .eq("status", "published").eq("source", "community")
      .order("created_at", { ascending: false }).limit(limit);
    tasks.push(q.then(({ data }) => (data || []).map(x => ({
      kind: "cipher", id: "cf_" + x.id, ts: x.created_at,
      author_name: x.author_name || "גולש", title: x.title || x.search_term,
      search_term: x.search_term, skip_distance: x.skip_distance, scope: x.scope,
      image_url: x.image_url, description: x.description, slug: x.slug,
    }))).catch(() => []));
  }

  if (wantInsights) {
    const q = supabase.from("insights")
      .select("id,title,body,origin,source_ref,related_numbers,created_at,verified,has_1820,convergence_score,panel_data")
      .eq("is_active", true)
      .order("created_at", { ascending: false }).limit(limit);
    tasks.push(q.then(({ data }) => (data || [])
      // ⛔ חידוש-קהילה מקודם ל-insights (panel_data.community) כבר מופיע בפיד כתרומה — עם דרגת-כותב
      //    ושרשור. מציגים רק את גרסת-התרומה → אפס כפילות, דרגה עקבית. insights שנשארים = מערכת/AI/צוריאל.
      .filter(x => !x.panel_data?.community)
      .map(x => ({
      kind: "insight", id: "i_" + x.id, insightId: x.id, ts: x.created_at,   // insightId = uuid גולמי למודרציה
      author_name: insightAuthor(x.origin),
      origin: x.origin,
      title: x.title, body: x.body, source_ref: x.source_ref, related_numbers: x.related_numbers,
      verified: x.verified, has_1820: x.has_1820, convergence_score: x.convergence_score,
      // מצביע לעמוד הקנוני של החידוש בבית המדרש (לא עותק)
      link: `/research?tool=midrash&tab=community&insight=${x.id}`,
    }))).catch(() => []));
  }

  if (wantContrib) {
    let q = supabase.from("research_contributions")
      .select("id,author_name,author_user_id,intent,research_state,status,target_type,target_id,title,body,reactions,pinned_at,created_at")
      .eq("status", "approved").is("parent_id", null)
      .order("created_at", { ascending: false }).limit(limit);
    if (type && type !== "post") q = q.eq("intent", type);
    tasks.push((async () => {
      const { data } = await q;
      const rows = data || [];
      // 🌳 עץ אחד: פותרים את שם-התצוגה הנוכחי (users.display_name) לפי author_user_id — «בחר שם» משתקף
      // מיד בפורום, בלי לגעת ב-author_name היציב (שעליו נשען הקישור לדף-החוקר). מקור-זהות אחד.
      const uids = [...new Set(rows.map(c => c.author_user_id).filter(Boolean))];
      const nameMap = {};
      if (uids.length) {
        try {
          const { data: us } = await supabase.from("users").select("id,display_name").in("id", uids);
          for (const u of us || []) { const d = (u.display_name || "").trim(); if (d) nameMap[u.id] = d; }
        } catch { /* noop */ }
      }
      // 🔗 ספירת «מצאתי קשר» (edges בגרף) לכל תרומה — תגית «חכמה» שנדלקת רק כשיש קשר (>0).
      const ids = rows.map(c => c.id);
      const linkCount = {};
      if (ids.length) {
        try {
          const { data: lk } = await supabase.from("contribution_links").select("from_contribution_id").in("from_contribution_id", ids);
          for (const l of lk || []) linkCount[l.from_contribution_id] = (linkCount[l.from_contribution_id] || 0) + 1;
        } catch { /* noop */ }
      }
      return rows.map(c => ({
        kind: "contribution", id: "c_" + c.id, contribId: c.id, ts: c.created_at,
        author_name: c.author_name, author_display: nameMap[c.author_user_id] || null,
        author_user_id: c.author_user_id, intent: c.intent, research_state: c.research_state,
        target_type: c.target_type, target_id: c.target_id, title: c.title, body: c.body, reactions: c.reactions,
        pinned: !!c.pinned_at, pinned_at: c.pinned_at, linkCount: linkCount[c.id] || 0,
      }));
    })().catch(() => []));
  }

  if (wantPosts) {
    const notInList = '("' + FORUM_EXCLUDE_AUTHORS.join('","') + '")';
    let q = supabase.from("posts")
      .select("id,title,slug,excerpt,author,date,image_url,categories")
      .not("author", "is", null).neq("author", "").not("author", "in", notInList)
      .order("date", { ascending: false }).limit(limit);
    if (writer) q = q.eq("author", writer);
    tasks.push(q.then(({ data }) => (data || [])
      .filter(p => { const a = (p.author || "").trim(); return a && !FORUM_EXCLUDE_AUTHORS.includes(a); })
      .map(p => ({
        kind: "post", id: "p_" + p.id, ts: p.date,
        author_name: (p.author || "").trim(), title: p.title, excerpt: p.excerpt,
        slug: p.slug, image_url: p.image_url, categories: p.categories,
      }))).catch(() => []));
  }

  const parts = await Promise.all(tasks);
  return parts.flat()
    .filter(x => x.ts)
    // 📌 מוצמדים תמיד למעלה (אדמין), אחר-כך החדשים למעלה
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.ts) - new Date(a.ts))
    .slice(0, limit);
}

// 👤 פרופיל-חוקר רשום (לא-אצור) — עדשה על research_contributions לפי שם-מחבר.
// מזין את דף-החוקר הקל (ResearcherProfile) כשאין שורת-contributor אצורה. עץ אחד: אותו דף,
// אצור או אוטומטי. מחזיר null אם אין ולו חידוש-מאושר אחד (אז אין פרופיל).
// 🔗 uid (אופציונלי) — מאחד חידושים שנרשמו תחת display_name וגם תחת username (כמו אריאל=«ariel123008»).
//    בלי זה חלק מחידושי-הפורום של החוקר לא הופיעו בדף שלו.
export async function getResearcherProfile(name, limit = 40, uid = null) {
  if (!supabase || (!name && !uid)) return null;
  try {
    let q = supabase.from("research_contributions")
      .select("id,author_name,author_user_id,intent,origin,research_state,status,target_type,target_id,title,body,gematria_claim,pinned_at,created_at")
      .in("status", ["approved", "published"]).is("parent_id", null)
      // 📌 מוצמדים (אדמין) קודם — «הגימטריות/החידושים הראשונים למעלה» — ואז החדשים
      .order("pinned_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }).limit(limit);
    if (uid && name) q = q.or(`author_user_id.eq.${uid},author_name.eq.${name}`);
    else if (uid) q = q.eq("author_user_id", uid);
    else q = q.eq("author_name", name);
    const { data } = await q;
    const items = data || [];
    if (!items.length) return null;
    const uid = items.find((x) => x.author_user_id)?.author_user_id || null;
    const joined = items.reduce((min, x) => (!min || x.created_at < min ? x.created_at : min), null);
    return { name, uid, count: items.length, joined, items };
  } catch { return null; }
}

// 📁 זרם-עדכוני-הכתבים — כל כתב עם last_activity + ספירות (צפנים/פוסטים/ממצאים), ממוין מהחדש.
// עדשה על contributors_feed() RPC (SECURITY DEFINER, grant anon+authenticated). כמו פורום/ערוצים:
// דף שמתעדכן עולה למעלה. מקשר ל-/community/researcher/:slug (עץ אחד, לא משכפל).
export async function getContributorsFeed(limit = 40) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.rpc("contributors_feed", { p_limit: limit });
    return data || [];
  } catch { return []; }
}

// 🏅 סטטיסטיקת-חוקר לכרטיס המפואר — הכל בקריאה אחת: ניקוד+דרגה, ספירות (צפנים/ממצאים/גימטריות/פוסטים),
// ורשימת הגימטריות שהכניס למערכת (research_contributions.gematria_claim.claim). RPC researcher_stats.
export async function getResearcherStats(userId, name) {
  if (!supabase || (!userId && !name)) return null;
  try {
    const { data } = await supabase.rpc("researcher_stats", { p_user_id: userId || null, p_name: name || "" });
    return data || null;
  } catch { return null; }
}

// 🎖️ «תיק חוקר» — מוניטין + דרגה (מבוסס-איכות)
export async function getReputation(userId = null) {
  if (!supabase) return null;
  try {
    const { data } = await supabase.rpc("researcher_reputation", userId ? { p_user_id: userId } : {});
    return data;
  } catch { return null; }
}

// ── מנהל ──
// תור-אישור: תרומות ממתינות (כולל אנונימיות) — דרך RPC מגודר-אדמין (RLS חוסם קריאה ישירה).
export async function getPendingContributions(limit = 100) {
  if (!supabase) return [];
  try { const { data } = await supabase.rpc("admin_pending_contributions", { p_limit: limit }); return data || []; }
  catch { return []; }
}
// מרכז-התגובות: כל התגובות לפי סטטוס ('pending'|'approved'|'hidden'|'all')
export async function getAllContributions(status = "pending", limit = 200) {
  if (!supabase) return [];
  try { const { data } = await supabase.rpc("admin_all_contributions", { p_status: status, p_limit: limit }); return data || []; }
  catch { return []; }
}
export async function approveContribution(id, { canonical = false, project = true } = {}) {
  const { data, error } = await supabase.rpc("approve_contribution", { p_id: id, p_canonical: canonical, p_project: project });
  if (error) throw error;
  return data;
}
export async function moderateContribution(id, status) {
  const { error } = await supabase.rpc("moderate_contribution", { p_id: id, p_status: status });
  if (error) throw error;
}
// ➕ קידום גימטריות של ממצא למילון (אדמין) — RPC מזהה ביטויים בטענה, מאמת כל אחד במנוע (ragil_calc),
// ומוסיף למילון על שם הכתב. מחזיר {ok, added[], in_dict[], unverified[]}. מאמת-מנוע = בטוח (gematria_engine_law).
export async function promoteFindingToDict(id) {
  const { data, error } = await supabase.rpc("promote_finding_to_dict", { p_id: id });
  if (error) throw error;
  return data;
}
// 📌 הצמדת/ביטול-הצמדת תרומה בפורום (אדמין בלבד — נאכף בשרת). pin=false מבטל.
export async function pinContribution(id, pin = true) {
  const { error } = await supabase.rpc("pin_contribution", { p_id: id, p_pin: pin });
  if (error) throw error;
}
