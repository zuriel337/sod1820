// 🔬 מערכת תרומות-המחקר (research_contribution_law) — עדשת-לקוח על research_contributions.
// מקור-אמת אחד; כל המשטחים (מחקר-קהילתי בכל דף) הם הקרנות. כתיבה דרך RPC (אוכף מודרציה-לפי-סוג).
import { supabase } from "./supabase.js";

// intent — מה המשתמש רצה לתרום. «תגובה» עולה מיד; השאר דורש אישור.
export const INTENTS = [
  { key: "תגובה", emoji: "💬", label: "תגובה", live: true },
  { key: "חידוש", emoji: "💡", label: "חידוש" },
  { key: "השערה", emoji: "🧩", label: "השערה" },
  { key: "תצפית", emoji: "🔍", label: "תצפית" },
  { key: "מקור",  emoji: "📚", label: "מקור" },
  { key: "שאלה",  emoji: "❓", label: "שאלה" },
  { key: "תיקון", emoji: "🛠", label: "תיקון" },
];
export const intentMeta = k => INTENTS.find(i => i.key === k) || { key: k, emoji: "•", label: k };

// research_state — מסע-המחקר (לא מודרציה)
export const STATE_META = {
  idea:          { emoji: "🟡", label: "רעיון" },
  discussion:    { emoji: "🔵", label: "בדיון" },
  investigating: { emoji: "🔬", label: "בבדיקה" },
  validated:     { emoji: "🟢", label: "אומת" },
  canonical:     { emoji: "🏛️", label: "קנוני" },
};
export const stateMeta = s => STATE_META[s] || STATE_META.idea;

// כל התרומות על ישות (RLS מחזירה מאושרים + הממתינים של המשתמש עצמו)
export async function getContributions(targetType, targetId, limit = 120) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("research_contributions")
      .select("id,author_name,author_user_id,intent,origin,research_state,status,target_type,target_id,parent_id,title,body,gematria_claim,created_at")
      .eq("target_type", targetType).eq("target_id", String(targetId))
      .order("created_at", { ascending: true }).limit(limit);
    return data || [];
  } catch { return []; }
}

export async function addContribution({ intent, origin, body, targetType, targetId, parentId = null, title = null, gematriaClaim = null }) {
  const { data, error } = await supabase.rpc("add_contribution", {
    p_intent: intent, p_origin: origin, p_body: body,
    p_target_type: targetType, p_target_id: targetId != null ? String(targetId) : null,
    p_parent_id: parentId, p_title: title, p_gematria_claim: gematriaClaim,
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
export async function getForumFeed({ type = null, writer = null, limit = 80 } = {}) {
  if (!supabase) return [];
  const wantContrib = !type || FORUM_CONTRIB_INTENTS.includes(type);
  const wantPosts = !type || type === "post";
  const tasks = [];

  if (wantContrib) {
    let q = supabase.from("research_contributions")
      .select("id,author_name,author_user_id,intent,research_state,status,target_type,target_id,title,body,created_at")
      .eq("status", "approved").is("parent_id", null)
      .order("created_at", { ascending: false }).limit(limit);
    if (type && type !== "post") q = q.eq("intent", type);
    tasks.push(q.then(({ data }) => (data || []).map(c => ({
      kind: "contribution", id: "c_" + c.id, ts: c.created_at,
      author_name: c.author_name, intent: c.intent, research_state: c.research_state,
      target_type: c.target_type, target_id: c.target_id, title: c.title, body: c.body,
    }))).catch(() => []));
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
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))   // 🆕 החדשים למעלה
    .slice(0, limit);
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
export async function approveContribution(id, { canonical = false, project = true } = {}) {
  const { data, error } = await supabase.rpc("approve_contribution", { p_id: id, p_canonical: canonical, p_project: project });
  if (error) throw error;
  return data;
}
export async function moderateContribution(id, status) {
  const { error } = await supabase.rpc("moderate_contribution", { p_id: id, p_status: status });
  if (error) throw error;
}
