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
      .select("id,author_name,author_user_id,intent,origin,research_state,status,target_type,target_id,parent_id,title,body,gematria_claim,image_url,is_featured,is_answer,pinned_at,convergence_slug,reactions,created_at")
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

// 💬 ספירת-תגובות לרשימת תרומות — כדי שכל כרטיס בפיד יראה «יש תגובה» (מונה ילדים לפי parent_id).
export async function getReplyCounts(ids = []) {
  const out = {};
  if (!supabase || !ids.length) return out;
  try {
    const { data } = await supabase.from("research_contributions")
      .select("parent_id").in("parent_id", ids).eq("status", "approved");
    (data || []).forEach(r => { if (r.parent_id) out[r.parent_id] = (out[r.parent_id] || 0) + 1; });
    return out;
  } catch { return out; }
}

// ⭐ אילו תרומות בפיד הולידו התכנסות (convergence_slug) — לסמל-הכתב «יצר התכנסות»
export async function getConvergenceSlugs(ids = []) {
  const out = {};
  if (!supabase || !ids.length) return out;
  try {
    const { data } = await supabase.from("research_contributions")
      .select("id,convergence_slug").in("id", ids).not("convergence_slug", "is", null);
    (data || []).forEach(r => { if (r.convergence_slug) out[r.id] = r.convergence_slug; });
    return out;
  } catch { return out; }
}

// 🌳 התכנסויות שכתב יצר — לדף-הכתב (topic_cards מאושרים לפי created_by). עדשה, לא מקור חדש.
export async function getResearcherConvergences(name) {
  if (!supabase || !name) return [];
  try {
    const { data } = await supabase.from("topic_cards")
      .select("slug,title,subtitle,highlight_numbers,meter_score,status")
      .eq("created_by", name).eq("status", "approved")
      .order("meter_score", { ascending: false, nullsFirst: false });
    return data || [];
  } catch { return []; }
}

export async function addContribution({ intent, origin, body, targetType, targetId, parentId = null, title = null, gematriaClaim = null, authorName = null, imageUrl = null }) {
  const { data, error } = await supabase.rpc("add_contribution", {
    p_intent: intent, p_origin: origin, p_body: body,
    p_target_type: targetType, p_target_id: targetId != null ? String(targetId) : null,
    p_parent_id: parentId, p_title: title, p_gematria_claim: gematriaClaim,
    p_author_name: authorName,   // 💬 שם לאנונימי (רשומים — נגזר מהחשבון בשרת)
    p_image_url: imageUrl,       // 📷 תמונה מצורפת לתגובה (Storage URL)
  });
  if (error) throw error;
  return data; // מזהה התרומה החדשה
}

// ✏️ עריכת תגובה/תרומה — המחבר (רשום) עורך את שלו · אדמין עורך של כל אחד (נאכף בשרת).
export async function editContribution(id, body) {
  const { error } = await supabase.rpc("edit_contribution", { p_id: id, p_body: body });
  if (error) throw error;
}

// 🗑 מחיקת תגובה — המחבר את שלו · אדמין את של כולם (מחיקה רכה, נאכף בשרת).
export async function removeContribution(id) {
  const { error } = await supabase.rpc("remove_contribution", { p_id: id });
  if (error) throw error;
}

// ⭐ סימון תגובה כ«מובחרת» (אדמין)
export async function featureContribution(id, on) {
  const { error } = await supabase.rpc("feature_contribution", { p_id: id, p_on: on });
  if (error) throw error;
}

// ✅ סימון תגובה כ«תשובה» (אדמין/שואל) — סוגר אתגר מקושר ומזכה את הפותֵר
export async function markAnswer(id, on) {
  const { error } = await supabase.rpc("mark_answer", { p_id: id, p_on: on });
  if (error) throw error;
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
// 🌳 חתימת-פריט לזיהוי «תאום» בפורום (עץ אחד — אפס כפילות): כותב + 24 תווי-טקסט ראשונים,
//    בלי HTML ובלי רווחים-כפולים. חידוש-קהילה (insight) שחתימתו זהה לתרומה = אותו פריט → מוסתר.
function feedSig(author, text) {
  const a = String(author || "").trim();
  const t = String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 24);
  if (!a && !t) return null;
  return a + "|" + t;
}

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
  // 🌳 עץ אחד: פוסט-כתב רגיל שייך ל«פעילות האתר» (includePosts). אבל פוסט שנותב במפורש
  //    לפורום (tag 'פורום') הוא תוכן-פורום לכל דבר — מופיע בפיד גם כש-includePosts=false, וכבר
  //    הוסתר מפידי-הפוסטים הרגילים (getPostsFromSupabase). "all"=כל הכתבים · "forum"=מנותבים בלבד.
  const postsMode = (!type || type === "post") ? (includePosts ? "all" : "forum") : null;
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
    // 🌳 עץ אחד: חידושי-קהילה (panel_data.community) מוצגים בפורום ככרטיס-חידוש — כולל חידוש
    //    שנוצר ישירות ב-insights בלי «תאום» תרומה (כמו צבי). הדדופ מול התרומות נעשה אחרי הטעינה
    //    (contribSigs) כדי שלא נראה פעמיים את מי שיש לו גם תרומה. insights שאינם-קהילה = מערכת/AI/צוריאל.
    tasks.push(q.then(({ data }) => (data || [])
      .map(x => {
      const community = !!x.panel_data?.community;
      return {
      kind: "insight", id: "i_" + x.id, insightId: x.id, ts: x.created_at,   // insightId = uuid גולמי למודרציה
      // 👤 חידוש-קהילה: השם האמיתי חי ב-panel_data.author (origin='צוריאל' הוא רק המזין/מאשר).
      author_name: community ? (x.panel_data?.author || insightAuthor(x.origin)) : insightAuthor(x.origin),
      origin: x.origin,
      _community: community,
      _convSlug: x.panel_data?.convergence_slug || null,   // בעל-התכנסות מיוצג ע"י התרומה/עמוד-ההתכנסות
      _sig: community ? feedSig(x.panel_data?.author, x.title || x.body) : null,
      title: x.title, body: x.body, source_ref: x.source_ref, related_numbers: x.related_numbers,
      verified: x.verified, has_1820: x.has_1820, convergence_score: x.convergence_score,
      // מצביע לעמוד הקנוני של החידוש בבית המדרש (לא עותק)
      link: `/research?tool=midrash&tab=community&insight=${x.id}`,
    }; })).catch(() => []));
  }

  if (wantContrib) {
    tasks.push((async () => {
      // 🌟 מקור-הפורום לתרומות = RPC forum_feed_contributions (SECURITY DEFINER):
      //   approved של כולם + published של כתבים-מהימנים בלבד (יניב/צבי) — כדי שהכתבים
      //   האיכותיים יופיעו בפורום (ה-RLS חושף רק approved) ולא יישארו חסומים. הדגל trusted
      //   מגיע מוכן לכל שורה (כולל שורות בלי user_id) → סימון «כתב מהימן» + מיון למעלה.
      let rows = [];
      try { const { data } = await supabase.rpc("forum_feed_contributions", { p_limit: limit }); rows = data || []; }
      catch { rows = []; }
      if (type && type !== "post") rows = rows.filter(c => c.intent === type);
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
        _sig: feedSig(c.author_name, c.title || c.body),   // 🌳 לזיהוי «תאום» חידוש-קהילה (דדופ)
        bump: c.last_activity_at || c.created_at,   // 🔼 זמן-הפעילות האחרונה (ריאקציה/תגובה) — לקביעת הסדר, לא לתצוגה
        author_name: c.author_name, author_display: nameMap[c.author_user_id] || null,
        author_user_id: c.author_user_id, intent: c.intent, research_state: c.research_state,
        trustedAuthor: !!c.trusted,
        target_type: c.target_type, target_id: c.target_id, title: c.title, body: c.body, reactions: c.reactions,
        pinned: !!c.pinned_at, pinned_at: c.pinned_at, linkCount: linkCount[c.id] || 0,
        // 🔢 ערך-הגימטריה של התרומה (לתג «מהנבחרות») — היעד-מספר, ואם אין, מ-gematria_claim.value
        gematriaValue: (c.target_type === "number" && /^\d+$/.test(String(c.target_id || "")))
          ? Number(c.target_id)
          : (c.gematria_claim?.value ? Number(c.gematria_claim.value) : null),
        hasGematria: !!(c.gematria_claim && (c.gematria_claim.claim || c.gematria_claim.value)),
      }));
    })().catch(() => []));
  }

  if (postsMode) {
    const notInList = '("' + FORUM_EXCLUDE_AUTHORS.join('","') + '")';
    let q = supabase.from("posts")
      .select("id,title,slug,excerpt,author,date,image_url,categories")
      .not("author", "is", null).neq("author", "").not("author", "in", notInList)
      .order("date", { ascending: false }).limit(limit);
    if (writer) q = q.eq("author", writer);
    // מצב-פורום: רק פוסטים שנותבו במפורש לפורום (tag 'פורום'). מצב-all: כל פוסטי-הכתבים.
    if (postsMode === "forum") q = q.contains("tags", ["פורום"]);
    tasks.push(q.then(({ data }) => (data || [])
      .filter(p => { const a = (p.author || "").trim(); return a && !FORUM_EXCLUDE_AUTHORS.includes(a); })
      .map(p => ({
        kind: "post", id: "p_" + p.id, ts: p.date,
        author_name: (p.author || "").trim(), title: p.title, excerpt: p.excerpt,
        slug: p.slug, image_url: p.image_url, categories: p.categories,
      }))).catch(() => []));
  }

  const parts = await Promise.all(tasks);
  let flat = parts.flat().filter(x => x.ts);

  // 🌳 עץ אחד — דדופ חידושי-קהילה מול תרומות-הפורום (אפס כפילות):
  //   • חידוש-קהילה שיש לו «תאום» תרומה (אותו כותב + פתיח-טקסט) → מוסתר, מוצג רק כתרומה (עשיר יותר).
  //   • חידוש-קהילה בעל convergence_slug → מוסתר (מיוצג ע"י התרומה עם ✦«יצר התכנסות» / עמוד ההתכנסות).
  //   • חידוש-קהילה בלי תאום (כמו צבי — נוצר ישירות ב-insights) → מוצג ככרטיס-חידוש בפורום.
  {
    const contribSigs = new Set(flat.filter(x => x.kind === "contribution" && x._sig).map(x => x._sig));
    flat = flat.filter(x => {
      if (x.kind !== "insight" || !x._community) return true;
      if (x._convSlug) return false;
      if (x._sig && contribSigs.has(x._sig)) return false;
      return true;
    });
  }

  // 🏆 «מהנבחרות» — תרומת-גימטריה שהערך שלה קיים במאגר ההתכנסויות האצור (convergences).
  //    בדיקה אחת מרוכזת (RPC SECURITY DEFINER) על כל הערכים — בלי בקשה לכל כרטיס.
  try {
    const vals = [...new Set(flat.filter(x => x.kind === "contribution" && x.hasGematria && x.gematriaValue > 0).map(x => x.gematriaValue))];
    if (vals.length) {
      const { data: present } = await supabase.rpc("convergence_values_present", { p_values: vals });
      const bank = new Set((present || []).map(Number));
      for (const x of flat) if (x.kind === "contribution") x.chosen = x.hasGematria && bank.has(x.gematriaValue);
    }
  } catch { /* noop — אין תג-נבחרת, לא שובר את הפיד */ }

  return flat
    // 📌 מוצמדים (אדמין) → 🔼 פעילות אחרונה (ריאקציה/תגובה מקפיצה למעלה) → 🌟 כתב-מהימן → החדשים
    //    ה-bump שומר על תאריך-הכתיבה המוצג (ts); רק הסדר מושפע. פריט שמגיבים/מסמנים בו עולה לראש.
    .sort((a, b) =>
      (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) ||
      (new Date(b.bump || b.ts) - new Date(a.bump || a.ts)) ||
      (b.trustedAuthor ? 1 : 0) - (a.trustedAuthor ? 1 : 0) ||
      new Date(b.ts) - new Date(a.ts))
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

// 🔢 גימטריות-הכתב לדף (page-only) + דגל «במערכת הראשית». מוצמדים+חדשים למעלה.
export async function getWriterGematrias(name, uid = null) {
  if (!supabase || (!name && !uid)) return [];
  try { const { data } = await supabase.rpc("writer_gematria_findings", { p_name: name || "", p_uid: uid || null }); return data || []; }
  catch { return []; }
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
// ➕ קידום גימטריות של ממצא ל«רשימת הגימטריות» (=gematria_words, המאגר היחיד — לא «מילון»/ישות מקבילה;
//    החלטת צוריאל 24.7.2026). אדמין. ה-RPC מזהה ביטויים בטענה, מאמת כל אחד במנוע (ragil_calc) ומוסיף על
//    שם הכתב. מחזיר {ok, added[], in_dict[], unverified[]}. מאמת-מנוע = בטוח (gematria_engine_law).
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
