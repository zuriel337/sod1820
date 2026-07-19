// 🖼️ מטריצות-דילוג שמורות (els_records) — עדשת-לקוח על הטבלה הקיימת. שיתופיות ולשיתוף.
// קריאה ציבורית למאושרות (status=published). כתיבה/אישור דרך RPC (SECURITY DEFINER).
import { supabase } from "./supabase.js";

const COLS = "id,slug,title,search_term,scope,skip_distance,direction,positions,image_url,description,author_name,primary_number,anchor_numbers,source,created_at";

// ספריית-הצפנים הראשית (וגם גלריית-הכלי/בית) — מאושרות, **בלי תיקיית-המחקר** (source='research').
// אלה חיים רק בתיקייה הנסתרת /codes/מחקר (getResearchMatrices). כך המחקר לא מוצג לכל מי שנכנס.
export async function getSavedMatrices(limit = 100) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("els_records").select(COLS)
      .eq("status", "published").or("source.is.null,source.neq.research")
      .order("created_at", { ascending: false }).limit(limit);
    return data || [];
  } catch { return []; }
}

// 🔬 תיקיית-המחקר (נסתרת) — רק צפני-מחקר מאושרים. עדשה על els_records where source='research'.
// לא מקושרת מהתפריט/בית/כלי — רק מי שנכנס לכתובת /codes/מחקר רואה (unlisted).
export async function getResearchMatrices(limit = 100) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("els_records").select(COLS)
      .eq("status", "published").eq("source", "research")
      .order("importance", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
    return data || [];
  } catch { return []; }
}

// 🔗 עמוד קנוני לצופן — שליפה לפי slug. בלי סינון-סטטוס בצד-לקוח: ה-RLS מחליט —
// אנונימי רואה רק published+public; בעל-הצופן/אדמין רואים גם טיוטה/מוסתר (לניהול מהעמוד).
export async function getMatrixBySlug(slug) {
  if (!supabase || !slug) return null;
  try {
    const { data } = await supabase.from("els_records").select(COLS + ",status")
      .eq("slug", slug).maybeSingle();
    return data || null;
  } catch { return null; }
}

// 🔠 הצפנים שלי — כל המטריצות ששמרתי (els_records שבבעלותי), בכל הסטטוסים.
// RLS els_owner_read מתיר לבעלים לקרוא את שלו (כולל pending/private). עדשה אישית — מקשרת
// לעמוד הקנוני /codes/:slug (לפורסמו), לא משכפלת. עץ אחד.
export async function getMyMatrices(uid, limit = 100) {
  if (!supabase || !uid) return [];
  try {
    const { data } = await supabase.from("els_records").select(COLS + ",status,visibility")
      .eq("owner_user_id", uid).order("created_at", { ascending: false }).limit(limit);
    return data || [];
  } catch { return []; }
}

// אדמין — מטריצות ממתינות לאישור
export async function getPendingMatrices(limit = 100) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("els_records").select(COLS + ",status")
      .eq("status", "pending").order("created_at", { ascending: false }).limit(limit);
    return data || [];
  } catch { return []; }
}

// 🗂️ אדמין — כל הטיוטות והמוסתרים (status != published). RLS admin_all_els מתיר לאדמין
// לקרוא הכל; ללא-אדמין הפוליסי חוסם → מוחזר ריק. עדשה לתיקיית-הניהול בספריית-הצפנים.
export async function getDraftMatrices(limit = 200) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("els_records").select(COLS + ",status,visibility")
      .neq("status", "published").order("created_at", { ascending: false }).limit(limit);
    return data || [];
  } catch { return []; }
}

export async function saveMatrix({ term, scope = "torah", skip = null, direction = null, positions = null, imageUrl = null, title = null, note = null, isPublic = true, fromTopic = null }) {
  const { data, error } = await supabase.rpc("save_els_matrix", {
    p_term: term, p_scope: scope, p_skip: skip, p_direction: direction,
    p_positions: positions, p_image_url: imageUrl, p_title: title, p_note: note,
    p_public: isPublic, p_from_topic: fromTopic,
  });
  if (error) throw error;
  return data;
}

// 👤 שמירה למשתמש לא-רשום (אנונימי) — נשמר עם visitor_id, נכנס כ«ממתין לאישור»
// (status=pending, source=community) ומופיע לאדמין בטאב-האישור. לא ציבורי עד אישור.
export async function saveMatrixAnon({ visitorId, authorName = null, term, scope = "torah", skip = null, direction = null, positions = null, imageUrl = null, title = null, note = null }) {
  const { data, error } = await supabase.rpc("save_els_matrix_anon", {
    p_visitor_id: visitorId, p_term: term, p_scope: scope, p_skip: skip,
    p_direction: direction, p_positions: positions, p_image_url: imageUrl,
    p_title: title, p_note: note, p_author_name: authorName,
  });
  if (error) throw error;
  return data;
}

export async function moderateMatrix(id, status) {
  const { error } = await supabase.rpc("moderate_els_matrix", { p_id: id, p_status: status });
  if (error) throw error;
}
