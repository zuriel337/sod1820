// 🖼️ מטריצות-דילוג שמורות (els_records) — עדשת-לקוח על הטבלה הקיימת. שיתופיות ולשיתוף.
// קריאה ציבורית למאושרות (status=published). כתיבה/אישור דרך RPC (SECURITY DEFINER).
import { supabase, SUPABASE_URL, SUPABASE_ANON } from "./supabase.js";

const COLS = "id,slug,title,search_term,scope,skip_distance,direction,positions,image_url,description,author_name,primary_number,anchor_numbers,source,created_at,self_published";

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

// 🔠 צפני-מערכת — published שהמערכת/אדמין הוסיפה (לא 'community' → פורום; לא 'research' → תיקייה נסתרת).
//    שייכים לזרם-המערכת הקנוני («פעילות האתר»/עדכונים אחרונים). עץ אחד: אותו els_records, עדשה שונה.
export async function getSystemCiphers(limit = 20) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("els_records").select(COLS)
      .eq("status", "published").not("source", "in", "(community,research)")
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
// 🔄 עוקף קאש-דפדפן (cache:no-store): PostgREST מחזיר את התגובה בלי Cache-Control, ולכן אחרי
//    עריכה/שמירה-מחדש הדפדפן עלול להגיש את ה-JSON הישן (הבאג «בחלון-סתר מופיעה הגרסה הישנה»).
//    fetch ישיר עם no-store מבטיח שהעמוד תמיד מקבל את הרשומה הטרייה. RLS נשמר: משתמש מחובר
//    שולח את access_token שלו (רואה גם טיוטה/פרטי משלו), אנונימי שולח anon (רק published+public).
export async function getMatrixBySlug(slug) {
  if (!supabase || !slug) return null;
  try {
    let token = SUPABASE_ANON;
    try { const { data: s } = await supabase.auth.getSession(); if (s?.session?.access_token) token = s.session.access_token; } catch { /* אנונימי */ }
    const url = `${SUPABASE_URL}/rest/v1/els_records?slug=eq.${encodeURIComponent(slug)}&select=${COLS},status&limit=1`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) throw new Error("rest " + res.status);
    const rows = await res.json();
    return (Array.isArray(rows) ? rows[0] : rows) || null;
  } catch {
    // נפילה ל-supabase-js אם ה-fetch נכשל (רשת/CORS חריג) — לפחות נטען, גם אם דרך הקאש
    try {
      const { data } = await supabase.from("els_records").select(COLS + ",status").eq("slug", slug).maybeSingle();
      return data || null;
    } catch { return null; }
  }
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

// 🌳 עץ אחד — הצפנים שמחוברים למספר הזה: primary_number=המספר (הדילוג) או שהמספר בין
// anchor_numbers (דילוג/גימטריית-המונח/גימטריית-הממצאים). עדשה הפוכה לדף-המספר (/number/:n).
// כך צופן «מלך ישראל בדילוג 103» מופיע גם ב-/number/103 וגם ב-/number/631 — לא משכפל, מפנה ל-/codes/:slug.
export async function getCiphersForNumber(n, limit = 12) {
  const num = parseInt(n, 10);
  if (!supabase || !Number.isFinite(num) || num <= 0) return [];
  try {
    const { data } = await supabase.from("els_records").select(COLS)
      .eq("status", "published")
      .or(`primary_number.eq.${num},anchor_numbers.cs.{${num}}`)
      .order("created_at", { ascending: false }).limit(limit);
    return data || [];
  } catch { return []; }
}

// 🔀 אדמין — כל ה«גרסאות» הממתינות (positions.variantOf קיים, לא-מוסתרות), לתור-האישור המרוכז.
// כל גרסה נושאת variantOfSlug (נשמר ב-#2) → קישור לעמוד-המקור למיזוג.
export async function getAllVariants(limit = 100) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("els_records").select(COLS + ",status")
      .not("positions->>variantOf", "is", null).neq("status", "hidden")
      .order("created_at", { ascending: false }).limit(limit);
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

// 📁 תיק המחקר — כל המטריצות של חוקר שגלויות בתיק שלו: «בתיק שלי» (self_published) או שפורסמו לאתר.
// עדשה ציבורית — anon רואה דרך policy public_read_self_published_els/public_read_published_els.
// לא כולל טיוטות פרטיות. מקשרת לעמוד הקנוני /codes/:slug (עץ אחד), לא משכפלת.
export async function getMatricesByOwner(uid, limit = 200) {
  if (!supabase || !uid) return [];
  try {
    const { data } = await supabase.from("els_records").select(COLS + ",status")
      .eq("owner_user_id", uid)
      .or("self_published.eq.true,status.eq.published")
      .order("created_at", { ascending: false }).limit(limit);
    return data || [];
  } catch { return []; }
}

// ✅ סימון/ביטול «בתיק שלי» — RPC self_publish_matrix (בעלים בלבד; ללא סף-דרגה — כל רשום).
// מחזיר {ok:true,self_published} או {ok:false,error:'not_owner'|'not_found'|'not_authenticated'}.
export async function selfPublishMatrix(id, on = true) {
  const { data, error } = await supabase.rpc("self_publish_matrix", { p_id: id, p_on: on });
  if (error) throw error;
  return data;
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

// 🔀 «גרסאות» שממתינות למיזוג לצופן זה — els_records שנשמרו על צופן קיים (positions.variantOf=parentId)
// ולא הוסתרו. אדמין-בלבד בפועל (RLS admin_all_els); ללא-אדמין מוחזר ריק. לפאנל-הניהול בעמוד-הצופן.
export async function getVariantsOf(parentId) {
  if (!supabase || !parentId) return [];
  try {
    const { data } = await supabase.from("els_records").select(COLS + ",status")
      .eq("positions->>variantOf", parentId).neq("status", "hidden")
      .order("created_at", { ascending: false });
    return data || [];
  } catch { return []; }
}

// 🔀 מיזוג גרסה לצופן המקורי (#1) + התראה לתורם (#3) — אטומי דרך RPC (אדמין). מחזיר {added,total}.
// משמש גם למיזוג-כפילויות: p_variant_id = הכפילות למזג, p_parent_id = הצופן שנשאר. גנרי.
export async function mergeVariant(variantId, parentId) {
  const { data, error } = await supabase.rpc("merge_els_variant", { p_variant_id: variantId, p_parent_id: parentId });
  if (error) throw error;
  return data;
}

// 🔁 כפילויות של צופן — רשומות אחרות עם אותו מונח·דילוג·היקף (מלבד הצופן עצמו). אדמין-בלבד
// (RLS admin_all_els) — מוצג בפאנל-הניהול כדי למזג ולנקות. כולל כל סטטוס (גם מוסתרים ישנים).
export async function getDuplicatesOf(m) {
  if (!supabase || !m?.id || !m.search_term) return [];
  try {
    const { data } = await supabase.from("els_records").select(COLS + ",status")
      .eq("search_term", m.search_term).eq("skip_distance", m.skip_distance || 0)
      .eq("scope", m.scope || "torah").neq("id", m.id)
      .order("created_at", { ascending: true });
    return data || [];
  } catch { return []; }
}

// 🗑 מחיקה-לצמיתות (אדמין) — delete_els_matrix (SECURITY DEFINER). לא ניתן לשחזר.
export async function deleteMatrix(id) {
  const { error } = await supabase.rpc("delete_els_matrix", { p_id: id });
  if (error) throw error;
}
