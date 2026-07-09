import { createClient } from '@supabase/supabase-js';
import { isAnon } from './privacy.js';
import { isReadable } from './nameMask.js';

const supabase = createClient(
  'https://linswmnnkjxvweumprav.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM'
);

export default supabase;
export { supabase };

export async function getPostsFromSupabase({ limit = 10, page = 1, category = null, tag = null, year = null, author = null, orderBy = 'date', ascending = false } = {}) {
  if (!supabase) return { posts: [], total: 0 };
  let query = supabase
    .from('posts')
    .select('*', { count: 'exact' })
    .order(orderBy, { ascending, nullsFirst: false })
    .range((page - 1) * limit, page * limit - 1);

  if (category) query = query.contains('categories', [category]);
  if (tag) query = query.contains('tags', [tag]);
  if (author) query = query.eq('author', author);
  if (year) {
    query = query
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31T23:59:59`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { posts: data ?? [], total: count ?? 0 };
}

// 🎬 פוסטי «קוד המציאות» — עדשת המציאות/קולנוע. מאחד את כל התגיות של העולם הזה
// (מימד חמש · מטריקס · משחקי הדיונון · קולנוע/סרטים) + קטגוריית «הצופן בסרטים», ממוזג
// ומדורג לפי תאריך-עדכון. עץ אחד — לא טבלה חדשה, רק עדשה על posts.
export const REALITY_CODE_TAGS = ["מימד חמש", "מטריקס", "משחקי הדיונון", "קולנוע"];
export const REALITY_CODE_CATS = ["הצופן בסרטים"];
export async function getRealityCodePosts(limit = 12) {
  if (!supabase) return [];
  try {
    const [byTag, byCat] = await Promise.all([
      supabase.from("posts").select("*").overlaps("tags", REALITY_CODE_TAGS).order("modified", { ascending: false, nullsFirst: false }).limit(limit),
      supabase.from("posts").select("*").overlaps("categories", REALITY_CODE_CATS).order("modified", { ascending: false, nullsFirst: false }).limit(limit),
    ]);
    const map = new Map();
    for (const p of [...(byTag.data || []), ...(byCat.data || [])]) map.set(p.id ?? p.wp_id, p);
    return [...map.values()]
      .sort((a, b) => new Date(b.modified || b.date) - new Date(a.modified || a.date))
      .slice(0, limit);
  } catch { return []; }
}

// Search in title + content, optional filters
export async function searchPosts(query, { limit = 40, category = null, tag = null, year = null } = {}) {
  if (!supabase || !query?.trim()) return [];
  const q = query.trim();
  let dbq = supabase
    .from('posts')
    .select('*')
    .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
    .order('date', { ascending: false })
    .limit(limit);
  if (category) dbq = dbq.contains('categories', [category]);
  if (tag) dbq = dbq.contains('tags', [tag]);
  if (year) dbq = dbq.gte('date', `${year}-01-01`).lte('date', `${year}-12-31T23:59:59`);
  const { data, error } = await dbq;
  if (error) throw error;
  return data ?? [];
}

// Fetch all distinct categories and tags (for dropdowns)
export async function getDistinctCategoriesAndTags() {
  if (!supabase) return { categories: [], tags: [] };
  const { data } = await supabase.from('posts').select('categories, tags');
  if (!data) return { categories: [], tags: [] };
  const cats = new Set(), tags = new Set();
  data.forEach(r => {
    (r.categories || []).forEach(c => c && cats.add(c));
    (r.tags || []).forEach(t => t && tags.add(t));
  });
  return { categories: [...cats].sort(), tags: [...tags].sort() };
}

// תגיות לפי פופולריות (כמות פוסטים) — לתצוגת "תגיות פופולריות"
export async function getTagCounts({ limit = 200 } = {}) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('tag_counts', { lim: limit });
  if (error) throw error;
  return data ?? [];
}

// "תגיות המספרים" מהגלריה — מספרי עוגן + כמות תמונות לכל מספר (מחבר לדף המספרים/מגירה)
export async function getGalleryNumberTags() {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('gallery_number_tags');
  if (error) throw error;
  return data ?? [];
}

export async function getPostBySlug(slug) {
  if (!supabase) return null;
  const decoded = decodeURIComponent(slug);
  const encoded = encodeURIComponent(decoded).toLowerCase();
  const slugs = [...new Set([slug, decoded, encoded])];
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .in('slug', slugs)
    .limit(1);
  if (error || !data?.length) return null;
  return data[0];
}

export async function getGematriaByPhrases(phrases) {
  if (!supabase || !phrases?.length) return [];
  const { data } = await supabase
    .from('gematria_words')
    .select('phrase, ragil')
    .in('phrase', phrases)
    .limit(5);
  return data ?? [];
}

// Get gematria words matching a specific value
export async function getGematriaByValue(value) {
  if (!supabase || !value) return [];
  const { data } = await supabase
    .from('gematria_words')
    .select('phrase, ragil')
    .eq('ragil', value)
    .order('created_at', { ascending: false, nullsFirst: false })   // ביטוי חדש שהוסף — תמיד למעלה
    .limit(12);
  return data ?? [];
}

// הצלבה-המונית: לכל ערך ברשימה — אילו ביטויים במאגר האתר שווים לו (לכלי «ניתוח קובץ»).
// מחזיר Map: value → [phrases]. שאילתה אחת (IN) במקום בקשה לכל ערך.
export async function getGematriaByValues(values) {
  const uniq = [...new Set((values || []).filter(v => Number.isFinite(v) && v > 0))];
  const out = new Map();
  if (!supabase || !uniq.length) return out;
  const { data } = await supabase
    .from('gematria_words')
    .select('phrase, ragil')
    .in('ragil', uniq)
    .limit(2000);
  for (const r of data ?? []) {
    if (!out.has(r.ragil)) out.set(r.ragil, []);
    out.get(r.ragil).push(r.phrase);
  }
  return out;
}

// ✦ מילים חדשות מהקהילה — N הביטויים האחרונים שנוספו למאגר (מאומתים), עם זמן.
export async function getRecentCommunityWords(limit = 4) {
  if (!supabase) return [];
  // «נוסף למאגר» = הפך לגלוי. מילה שאושרה/נחשפה עכשיו (visibility_changed_at) קופצת לראש —
  // גם אם ה-created_at שלה ישן. מושכים לפי שני הצירים וממזגים לפי «רגע-החשיפה» האפקטיבי.
  const clean = arr => (arr ?? []).filter(r => r.phrase && !/^[\d\s.,-]+$/.test(r.phrase.trim()) && r.ragil > 0);
  const sel = 'phrase, ragil, created_at, visibility_changed_at';
  const [byCreated, byVis] = await Promise.all([
    supabase.from('gematria_words').select(sel).eq('is_verified', true)
      .not('created_at', 'is', null).order('created_at', { ascending: false, nullsFirst: false }).limit(limit * 3),
    supabase.from('gematria_words').select(sel).eq('is_verified', true)
      .not('visibility_changed_at', 'is', null).order('visibility_changed_at', { ascending: false, nullsFirst: false }).limit(limit * 3),
  ]);
  const seen = new Set(), merged = [];
  for (const r of [...clean(byCreated.data), ...clean(byVis.data)]) {
    if (seen.has(r.phrase)) continue; seen.add(r.phrase);
    const eff = Math.max(new Date(r.created_at || 0).getTime(), new Date(r.visibility_changed_at || 0).getTime());
    merged.push({ ...r, created_at: new Date(eff).toISOString() });   // «נוסף» = רגע-החשיפה האפקטיבי
  }
  return merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, limit);
}

// 📡 שידורים חיים (channel_updates) — «עדכון חי» בטיקר + כרטיס בעמוד הבית.
// קריאה ציבורית: רק live שלא פג; כתיבה: אדמין בלבד (RLS). מקור עתידי: גשר הוואטסאפ.
// channel: null = הטיקר הראשי (main + reality-code) · 'or-geula'/'reality-code' = טיקר ממותג
// byDate=true → מיון לפי תאריך בלבד (החדשים קודם), בלי priority — לפידים החיים («מכל הערוצים»),
// כדי שעדכוני היום לא ייחסמו ע״י שורות ישנות בעלות priority גבוה.
export async function getChannelUpdates(limit = 6, channel = null, byDate = false) {
  if (!supabase) return [];
  let q = supabase.from('channel_updates')
    .select('id,text,image_url,credit,channel,is_urgent,created_at,link_url,source')
    .eq('status', 'live')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  q = byDate ? q.order('created_at', { ascending: false })
             : q.order('priority', { ascending: false }).order('created_at', { ascending: false });
  q = q.limit(limit);
  q = channel ? q.eq('channel', channel) : q.in('channel', ['main', 'reality-code']);
  const { data } = await q;
  return data || [];
}
// 👤 כל העדכונים החיים של כתב מסוים (credit) — עדשה על channel_updates לדף הכתב (ContributorPage).
// עץ אחד: לא עותק — אותו מקור של הטיקר/מרכז השידורים, מסונן לפי הכותב.
export async function getUpdatesByReporter(credit, limit = 60) {
  return getUpdatesByReporterNames([credit], limit);
}
// גרסה לפי כמה שמות (display_name + כינויי-וואטסאפ wa_names) — כדי שעדכוני כתב תחת
// שם-וואטסאפ שונה (למשל «OPOC1 OPOC1» → צבי) יופיעו כולם בדף הכתב הקנוני.
export async function getUpdatesByReporterNames(names, limit = 60) {
  const list = (Array.isArray(names) ? names : [names]).map(n => (n || "").trim()).filter(Boolean);
  if (!supabase || !list.length) return [];
  const { data } = await supabase.from('channel_updates')
    .select('id,text,image_url,credit,channel,created_at,link_url,source')
    .eq('status', 'live')
    .in('credit', list)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}
// 🔖 שמירת-מסע ל-DB (visitor_id + השורש + השביל) — כדי לראות בניהול מי שמר איזה מסע.
export async function logJourneySave(visitor, { root, path = [], world = null }) {
  if (!supabase || root == null) return;
  try { await supabase.rpc("log_journey_save", { p_visitor: visitor || null, p_root: root, p_path: path, p_world: world }); } catch { /* ignore */ }
}
// 🧭 משפך-המסע (בקשת צוריאל B) — דרך RPC admin_journey_funnel (page_views חסום ל-SELECT ב-RLS!).
export async function getJourneyFunnel(days = 7) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('admin_journey_funnel', { p_days: days });
    if (error || !data || data.error) return null;
    return data;
  } catch { return null; }
}
// 🪙 מד-טוקנים: כמה טוקנים ועלות ($) עלו קריאות ה-AI (מסע/ניתוח/מחקר) בטווח ימים.
// מקור: ai_token_log (נכתב בצד-שרת מ-data.usage של Anthropic). RPC admin_ai_tokens מסכם + מתמחר.
export async function getAiTokenUsage(days = 7) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('admin_ai_tokens', { p_days: days });
    if (error) return null;
    return data || null;
  } catch { return null; }
}
// 💰 מרכז עלות AI מאוחד — כל המדדים במקום אחד: total · by_source · by_model · by_kind · by_day (מגמה) ·
//   wa (פעילות בוט וואטסאפ לפי קבוצה/צ׳אט + כמות הודעות). מקור: ai_token_log (עלות $) + wa_bot_log (הודעות).
//   RPC admin_ai_cost — מתמחר לפי _ai_price(model): haiku $1/$5 · sonnet $3/$15 · opus $15/$75 ל-1M.
export async function getAiCostMetrics(days = 30) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('admin_ai_cost', { p_days: days });
    if (error) return null;
    return data || null;
  } catch { return null; }
}
// 🖥️ קונסולת-מילים לאדמין — RPC SECURITY DEFINER שעוקף RLS (רואה גם is_verified=false).
// scope: pending|verified|rejected|all · pagination · המלצת-AI + חיבור-לישות לכל שורה.
export async function adminWordsConsole({ scope = 'pending', q = null, limit = 50, offset = 0 } = {}) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('admin_words_console', { p_scope: scope, p_q: q, p_limit: limit, p_offset: offset });
    if (error) return null;
    return data || null;
  } catch { return null; }
}
export async function adminReviewWord(id, action) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('wa_word_review', { p_id: id, p_action: action });
  if (error) throw error;
  return data;
}
// 🙈 הסתרת מילה/ביטוי לנצח מכל המאגר (אדמין בדף המספר). מסמן את כל השורות עם אותו טקסט.
export async function adminHideWord(phrase) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('admin_hide_word', { p_phrase: phrase });
  if (error) throw error;
  return data;   // { ok, hidden, phrase } | { error }
}

// 🌍 קשרים בין שפות (אשף שמעון) — שכבת מחקר LCE. הכול pending עד אישור אדמין.
export async function langLinkAdd({ hebrew, foreign, lang = 'en', rel = 'semantic', note = null, name = null, visitor = null }) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('lang_link_add', {
    p_hebrew: hebrew, p_foreign: foreign, p_lang: lang, p_rel: rel, p_note: note, p_name: name, p_visitor: visitor,
  });
  if (error) throw error;
  return data;   // { ok, id, gematria_he, status } | { error }
}
export async function langLinksList(visitor = null) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('lang_links_list', { p_visitor: visitor });
  if (error) return [];
  return data || [];
}
export async function langLinksPending() {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('lang_links_pending');
  if (error) return [];
  return data || [];
}
export async function langLinkReview(id, action) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('lang_link_review', { p_id: id, p_action: action });
  if (error) throw error;
  return data;   // 'approved' | 'rejected' | 'deleted' | 'forbidden'
}
// 🔎 מנוע-הגילוי החוצה-שפתי — שאילתת-הליבה. מילה לועזית (או עברית) → פרישה על כל
// השיטות, התכנסויות מדורגות בנדירות (gold/strong/weak). המסננים רצים בחיפוש, לא כשער.
export async function enSearch(word, maxMatches = 8) {
  if (!supabase || !word?.trim()) return [];
  const { data, error } = await supabase.rpc('fn_en_search', { p_word: word.trim(), p_max_matches: maxMatches });
  if (error) return [];
  return data || [];   // [{ input_hebrew, method, value, rarity, signal, matches[] }]
}
// 🔔 אירועי-גילוי — זיהוי התכנסויות אמיתיות + שליחת מייל לרשימה (עץ אחד: אותה רשימת subscribers).
export async function scanDiscoveryEvents({ days = 7, minMembers = 8 } = {}) {
  if (!supabase) return null;
  try { const { data, error } = await supabase.rpc('scan_discovery_events', { p_days: days, p_min_members: minMembers }); if (error) return null; return data; } catch { return null; }
}
export async function discoveryPending() {
  if (!supabase) return null;
  try { const { data, error } = await supabase.rpc('discovery_events_pending'); if (error) return null; return data; } catch { return null; }
}
export async function discoveryMark(id, status) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('discovery_event_mark', { p_id: id, p_status: status }); if (error) throw error; return data;
}
// ✉️ שליחת קמפיין — עוטף את send-newsletter (אדמין, Resend). source=null → כולם · dry_run → ספירה · test_email → בדיקה.
export async function sendNewsletter({ subject, html, source = null, testEmail = null, dryRun = false }) {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke('send-newsletter', { body: { subject, html, source, test_email: testEmail, dry_run: dryRun } });
  if (error) throw error;
  return data;
}
// 🔗 סוגי-התכנסויות ממתינות — ליבה / קהילה / מעורב (להחלטה איפה תוכן-אנשים חי).
export async function adminConvergenceTypes(min = 2) {
  if (!supabase) return null;
  try { const { data, error } = await supabase.rpc('admin_convergence_types', { p_min: min }); if (error) return null; return data; } catch { return null; }
}
// 🧹 סינון-מסה לערימות-ההמתנה — ספירת דליים + פעולת-מסה (reject_junk / approve_good).
export async function adminTriageCounts() {
  if (!supabase) return null;
  try { const { data, error } = await supabase.rpc('admin_triage_counts'); if (error) return null; return data; } catch { return null; }
}
export async function adminBulkTriage(action) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('admin_bulk_triage', { p_action: action }); if (error) throw error; return data;
}
// 🌍 מילים חדשות באנגלית — קורא מאותו מקור של «דף האנגלית» (language_links, מאושרים)
// דרך ה-RPC הקנוני lang_links_list (SECURITY DEFINER) — עץ אחד, בלי טבלה מקבילה.
// ממופה לצורת התצוגה הקיימת: { alias, gematria_words:{ phrase, ragil } }.
export async function getRecentEnglishWords(limit = 3) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('lang_links_list', { p_visitor: null });
  if (error || !Array.isArray(data)) return [];
  return data
    .filter(r => (r.lang || 'en') === 'en' && r.status === 'approved' && r.foreign_word && r.hebrew)
    .slice(0, limit)
    .map(r => ({ alias: r.foreign_word, gematria_words: { phrase: r.hebrew, ragil: r.gematria_he } }));
}
// 🌍 הוספת תרגום/תעתוק אנגלי למילה עברית — ממלא את מאגר-האנגלית (word_aliases).
export async function addEnglishAlias({ phrase, alias, method = 'transliteration', verified = true }) {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('add_word_alias', {
    p_phrase: phrase, p_alias: alias, p_lang: 'en', p_type: method, p_source: 'admin', p_method: method, p_confidence: 1, p_verified: verified,
  });
  if (error) throw error;
  return data;
}
// 🔷 אוצרות הגילוי — הצלבה חוצת-שיטות: ביטויים ששווים למספר-העוגן בשיטה כלשהי.
// היררכיה (otzarot_giluy_hierarchy): שכבה 1 «אוצרות הגילוי» · שכבה 2 «השלמה לאוצרות». עץ אחד — קורא מ-gematria_words לפי תגית.
export async function getGiluyTreasures(anchor) {
  if (!supabase || !anchor) return { core: [], supplement: [] };
  const { data } = await supabase.from('gematria_words')
    .select('phrase, ragil, other_value, other_method, tags')
    .or(`other_value.eq.${anchor},ragil.eq.${anchor}`)
    .overlaps('tags', ['אוצרות הגילוי', 'השלמה לאוצרות'])
    .limit(80);
  const rows = data || [];
  const method = r => r.other_method || (r.ragil === anchor ? 'רגיל' : '');
  const seen = new Set();
  const pick = tier => rows.filter(r => {
    const tags = r.tags || [];
    if (tier === 'core' && !tags.includes('אוצרות הגילוי')) return false;
    if (tier === 'supp' && !(tags.includes('השלמה לאוצרות') && !tags.includes('אוצרות הגילוי'))) return false;
    if (seen.has(r.phrase)) return false; seen.add(r.phrase); return true;
  }).map(r => ({ phrase: r.phrase, method: method(r) }));
  return { core: pick('core'), supplement: pick('supp') };
}
// 🎯 «להיכנס להתכנסות» — כל הביטויים באותו ערך-רגיל (מאומתים + ממתינים), לאדמין (עוקף RLS).
export async function adminValueConvergence(value) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc('admin_value_convergence', { p_value: value });
    if (error) return null;
    return data || null;
  } catch { return null; }
}
// ✨ changelog «מה הוספנו לאתר» — לטיקר האוטומטי (בלי טיפול ידני של צוריאל).
export async function getSiteUpdates(limit = 6) {
  if (!supabase) return [];
  const { data } = await supabase.from('site_updates').select('icon,title,link_url')
    .eq('is_active', true).order('priority', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
  return data || [];
}
export async function broadcastChannelUpdate({ text, imageUrl = null, hours = null, urgent = false, credit = null, channel = 'main' }) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.from('channel_updates').insert({
    text, image_url: imageUrl || null, is_urgent: urgent, credit: credit || null, channel,
    expires_at: hours ? new Date(Date.now() + hours * 3600e3).toISOString() : null,
  }).select('id').maybeSingle();
  if (error) throw error;
  return data;
}
export async function listChannelUpdates(limit = 30) {   // אדמין — כולל כבויים/שפגו
  if (!supabase) return [];
  const { data } = await supabase.from('channel_updates')
    .select('*').order('created_at', { ascending: false }).limit(limit);
  return data || [];
}
export async function setChannelUpdateStatus(id, status) {
  if (!supabase) throw new Error('no supabase');
  const { error } = await supabase.from('channel_updates').update({ status }).eq('id', id);
  if (error) throw error;
}

// סך כל המילים במאגר — count מדויק בלי למשוך שורות (לפי האמת, לא מספר קבוע)
export async function getGematriaWordsCount() {
  if (!supabase) return 0;
  const { count } = await supabase
    .from('gematria_words')
    .select('*', { count: 'exact', head: true });
  return count || 0;
}

// ===== ארכיון הגלריות ("גלריית רמזי הגאולה") =====
// סקירה: רשימת גלריות + תמונות קלות (לכריכה+ספירה).
// מטמון פר-סשן לסקירת הארכיון — מונע משיכה חוזרת של כל ~2,500 השורות בכל כניסה/חזרה ל-/archive.
// מתאפס אוטומטית בכל כתיבה לתמונה (invalidateGalleriesOverview) וגם אחרי TTL קצר.
let _overviewCache = null;            // { ts, gals, imgs }
const OVERVIEW_TTL = 120000;          // 2 דקות — טרי מספיק, חוסך טעינות חוזרות
export function invalidateGalleriesOverview() { _overviewCache = null; }

export async function getGalleriesOverview({ force = false } = {}) {
  if (!supabase) return { gals: [], imgs: [] };
  if (!force && _overviewCache && Date.now() - _overviewCache.ts < OVERVIEW_TTL) {
    return { gals: _overviewCache.gals, imgs: _overviewCache.imgs };
  }
  const { data: gals } = await supabase
    .from('galleries')
    .select('id,name,anchor_number,img_count,wp_gallery_id');
  let imgs = [], from = 0;
  while (true) {
    const { data } = await supabase
      .from('gallery_images')
      .select('id,gallery_id,image_url,thumb_url,name,description,ordering,primary_value,all_values,occurred_at,created_at,importance,image_type,source,curator_hidden,tags')
      .not('image_url', 'is', null)
      .order('occurred_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(from, from + 999);
    if (!data || !data.length) break;
    imgs = imgs.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  _overviewCache = { ts: Date.now(), gals: gals || [], imgs };
  return { gals: gals || [], imgs };
}

// ✦ עוגן-המהות של מספר — «מהות המספר» (עובדה+רמז מאומתים) לדף המספר. null אם אין.
export async function getNumberAnchor(value) {
  if (!supabase || value == null) return null;
  try {
    const { data } = await supabase.from('number_anchors')
      .select('value,category,fact,hint').eq('value', value).maybeSingle();
    return data || null;
  } catch { return null; }
}

// 🤖 מסר-מסע אישי מהמנוע (AI) — Edge Function journey-message.
// מקבל את המספר, מסלול הביטויים, העולם והמהות; מחזיר טקסט קצר בעברית או null.
// נכשל בשקט (null) אם אין מפתח / שגיאה → הקורא נופל להודעת-התבנית הקיימת.
export async function getJourneyMessage({ value, path, world, meaning, depth, again, name }) {
  if (!supabase || value == null) return null;
  try {
    const { data, error } = await supabase.functions.invoke('journey-message', {
      body: { value, path, world, meaning, depth, again, name },
    });
    if (error) return null;
    return data?.message || null;
  } catch { return null; }
}

// 🤖 ניתוח AI גנרי לכלי המחקר (השוואה · נוטריקון · פסוק · פסוק-יומי) — Edge Function ai-analyze.
// facts = עובדות מאומתות מהמנוע (ערכים שכבר חושבו). ה-AI רק מפרש, לא מחשב. null בכשל/ללא מפתח.
// engine: 'claude' (ברירת-מחדל) | 'gemini' — מנוע נוסף להשוואה (A/B). אותן עובדות, פרשן אחר.
export async function getAiAnalysis({ kind, subject, facts, again, fast, engine }) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.functions.invoke('ai-analyze', { body: { kind, subject, facts, again, fast, engine } });
    if (error) { try { console.warn('[ai-analyze] invoke error:', error?.message || error); } catch { /* noop */ } return null; }
    if (data?.error) { try { console.warn('[ai-analyze] server:', data.error, data.detail || ''); } catch { /* noop */ } }
    return data?.analysis || null;
  } catch (e) { try { console.warn('[ai-analyze] threw:', e?.message || e); } catch { /* noop */ } return null; }
}

// 🔑 חלונות הגילוי — סטורי בראש דף הבית. קריאה ציבורית (RLS: active=true). מיון: sort↓ ואז חדש.
export async function getStories(lim = 20) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('stories')
      .select('id,title,image_url,video_url,link,credit,contributor_slug,sort')
      .eq('active', true)
      .order('sort', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(lim);
    return data || [];
  } catch { return []; }
}

// 🧲 לכידת ליד-מחקר (research_workspace funnel שלב 4) — מייל + snapshot של תיק-המחקר.
// הכנסה ציבורית מותרת (RLS insert בלבד; קריאה = server-only). מחזיר true בהצלחה.
export async function saveResearchLead({ email, items, visitorId }) {
  if (!supabase || !email) return false;
  try {
    const clean = (items || []).slice(0, 40).map(e => ({
      type: e.type, title: e.title,
      value: e.metadata?.value ?? null, meaning: e.metadata?.meaning ?? null,
      link: e.link || null,
    }));
    const { error } = await supabase.from('research_leads').insert({
      email: String(email).trim().toLowerCase(), items: clean, visitor_id: visitorId || null,
    });
    return !error;
  } catch { return false; }
}

// המספרים החזקים בכל המאגר (אגרגציה) — לבועות-העל בדף הבית. [{value,count}].
export async function getTopPrimaryValues(lim = 16) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('top_primary_values', { lim });
  if (error || !data) return [];
  return data.map(r => ({ value: Number(r.value), count: Number(r.cnt) }));
}

// 🔎 Collective Discovery — כמה חוקרים שונים אוספים ישות (ספירה בלבד, פרטיות-בטוח). RPC entity_collective_count.
export async function getCollectiveCount(type, ref) {
  if (!supabase || !type || ref == null) return 0;
  try {
    const { data } = await supabase.rpc('entity_collective_count', { p_type: type, p_ref: String(ref) });
    return typeof data === 'number' ? data : (parseInt(data, 10) || 0);
  } catch { return 0; }
}

// מה שהקהילה חוקרת עכשיו — ישויות שנאספו ע"י >= minUsers חוקרים (אגרגט, בלי זהויות). RPC top_collective.
export async function getTopCollective(minUsers = 2, lim = 12) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.rpc('top_collective', { min_users: minUsers, lim });
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

// 🌳 סטטיסטיקת העץ האישי של המשתמש המחובר — גודל האוסף + כמה מהחיפושים שלו. למד-הפרופיל.
export async function getMyTreeStats() {
  const empty = { total: 0, searched: 0, words: 0 };
  if (!supabase) return empty;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return empty;
    const [totalRes, searchedRes, wordsRes] = await Promise.all([
      supabase.from('research_items').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('research_items').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('bucket', 'searched'),
      supabase.rpc('my_words_in_engine'), // "N מהמילים שלך במנוע" (contribution_events, צד סוכן-2)
    ]);
    const words = typeof wordsRes.data === 'number' ? wordsRes.data : (parseInt(wordsRes.data, 10) || 0);
    return { total: totalRes.count || 0, searched: searchedRes.count || 0, words };
  } catch { return empty; }
}

// סך התמונות הציבוריות בארכיון — ל«באנר האוצר» בדף הבית.
export async function getGalleryImageCount() {
  if (!supabase) return 0;
  const { count } = await supabase.from('gallery_images')
    .select('*', { count: 'exact', head: true })
    .not('image_url', 'is', null).not('curator_hidden', 'is', true).eq('min_tier', 0);
  return count || 0;
}

// מטא-דאטה של גלריות לפי wp_gallery_id — לרצועת «פתח את הגלריה המלאה» בפוסט ישן.
// עץ אחד: הפוסט שומר את התמונות המוטמעות, וזה רק מפנה לעדשה העריכה (לא משכפל).
export async function getGalleriesByWpIds(wpIds) {
  if (!supabase || !Array.isArray(wpIds) || !wpIds.length) return [];
  const { data } = await supabase
    .from('galleries')
    .select('id,name,anchor_number,img_count,wp_gallery_id')
    .in('wp_gallery_id', wpIds);
  return data || [];
}

// ===== סטים של מספרים (number_sets) =====
export async function getNumberSets() {
  if (!supabase) return [];
  const { data } = await supabase.from('number_sets').select('*')
    .eq('is_active', true).order('sort_order', { ascending: true }).order('created_at', { ascending: true });
  return data || [];
}
export async function saveNumberSet({ id, name, numbers, description = null, sort_order = 0, image_order = undefined, show_on_home = undefined }) {
  if (!supabase) throw new Error('no supabase');
  const row = { name, numbers, description, sort_order };
  if (image_order !== undefined) row.image_order = image_order;
  if (show_on_home !== undefined) row.show_on_home = show_on_home;
  if (id) {
    const { data, error } = await supabase.from('number_sets')
      .update({ ...row, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle();
    if (error) throw error; return data;
  }
  const { data, error } = await supabase.from('number_sets').insert(row).select().maybeSingle();
  if (error) throw error; return data;
}
export async function deleteNumberSet(id) {
  if (!supabase) throw new Error('no supabase');
  const { error } = await supabase.from('number_sets').delete().eq('id', id);
  if (error) throw error;
}
// סטים שצוריאל סימן «הצג בדף הבית» — שליטה אילו סדרות גימטריה מהגלריה מופיעות בבית.
export async function getHomeSets() {
  if (!supabase) return [];
  const { data } = await supabase.from('number_sets').select('*')
    .eq('is_active', true).eq('show_on_home', true)
    .order('sort_order', { ascending: true }).order('created_at', { ascending: true });
  return data || [];
}

// ===== פיד «עדכוני גלריה» — עדשה על gallery_images (source='update') =====
// תצלומי-עדכון טריים (חדשות/ממצאים) — לא טבלה חדשה, רק שאילתה. החדש למעלה.
export async function getGalleryUpdates(limit = 60) {
  if (!supabase) return [];
  const { data } = await supabase
    .from('gallery_images')
    .select('id,image_url,thumb_url,name,description,primary_value,all_values,occurred_at,created_at,stream_at,importance')
    .eq('source', 'update')
    .not('image_url', 'is', null)
    .not('curator_hidden', 'is', true)
    .eq('min_tier', 0)                                               // נראות: ציבורי בלבד (פרימיום/מוסתר נחסם)
    .order('stream_at', { ascending: false, nullsFirst: false })    // 🌊 לפי «נוסף לזרם»
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ===== זרם המציאות (Reality Stream) — כל ה«רמזים» (source='update') במאגר אחד =====
// יחידת הבסיס היא רמז: תמונה + מספר דומיננטי (primary_value) + תאריך + תגיות (all_values
// + ocr_meta.entities). שולפים פעם אחת, והמיון/סינון/דופק מחושבים בצד-לקוח (src/lib/reality.js).
export async function getRealityHints(limit = 1000) {
  if (!supabase) return [];
  const { data } = await supabase
    .from('gallery_images')
    .select('id,image_url,thumb_url,name,description,primary_value,all_values,occurred_at,created_at,stream_at,importance,ocr_meta,image_type')
    .eq('source', 'update')
    .not('image_url', 'is', null)
    .not('curator_hidden', 'is', true)
    .eq('min_tier', 0)                                               // נראות: ציבורי בלבד
    .order('stream_at', { ascending: false, nullsFirst: false })    // 🌊 הכי-חדש-שנוסף-לזרם ראשון (חלון 50)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// 🔥 המספרים החמים באתר — לפי מפת-החום האמיתית (search_log, 7 ימים): אילו מספרים הכי חיפשו.
// ספירה בצד-לקוח על values בלבד (בלי מונחים — פרטיות). [{n, count}] ממוין חם→קר.
export async function getHotNumbers(days = 7, lim = 10) {
  if (!supabase) return [];
  try {
    const since = new Date(Date.now() - days * 864e5).toISOString();
    const { data } = await supabase.from('search_log').select('value')
      .gte('created_at', since).not('value', 'is', null).limit(4000);
    const counts = new Map();
    for (const r of (data || [])) {
      const n = Number(r.value);
      if (n > 0) counts.set(n, (counts.get(n) || 0) + 1);
    }
    return [...counts.entries()].map(([n, count]) => ({ n, count }))
      .sort((a, b) => b.count - a.count).slice(0, lim);
  } catch { return []; }
}

// 👑 «אוצרות הגילוי» — ציר-הערך: תמונות שצוריאל סימן treasure=true (אצירה ידנית, לא תלוי-זמן).
// סדר: הבלטה (importance) ואז חדש→ישן. הראשונה = «בחירת העורך» (ה-Hero של שער-המוזיאון).
export async function getTreasures(limit = 12) {
  if (!supabase) return [];
  const { data } = await supabase
    .from('gallery_images')
    .select('id,image_url,thumb_url,name,description,primary_value,all_values,occurred_at,created_at,stream_at,importance,image_type')
    .eq('treasure', true)
    .not('image_url', 'is', null)
    .not('curator_hidden', 'is', true)
    .eq('min_tier', 0)
    .order('importance', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ===== אוספים (gallery_collections) — גלריות/אוספים/מסלולים גמישים מעל הדרגות הקבועות =====
// אוסף = כלל (filter jsonb) על gallery_images. הדרגה (image_type) לא משתנה; זו רק תצוגה.
export async function getGalleryCollections() {
  if (!supabase) return [];
  const { data } = await supabase.from('gallery_collections')
    .select('id,slug,title,description,kind,filter,is_premium,cover_url,sort')
    .eq('is_active', true).order('sort', { ascending: true });
  return data || [];
}

// תמונות של אוסף לפי ה-filter שלו ({tag}/{primary_value}/{source}/{image_type}). נראות ציבורית בלבד.
export async function getCollectionImages(filter, limit = 500) {
  if (!supabase || !filter) return [];
  let q = supabase.from('gallery_images')
    .select('id,image_url,thumb_url,name,description,primary_value,all_values,occurred_at,created_at,importance,image_type,tags')
    .not('image_url', 'is', null).not('curator_hidden', 'is', true).eq('min_tier', 0);
  if (filter.tag) q = q.contains('tags', [filter.tag]);
  if (filter.primary_value) q = q.eq('primary_value', filter.primary_value);
  if (filter.source) q = Array.isArray(filter.source) ? q.in('source', filter.source) : q.eq('source', filter.source);
  if (filter.image_type) q = q.eq('image_type', filter.image_type);
  const { data } = await q
    .order('importance', { ascending: false, nullsFirst: false })
    .order('occurred_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// תחנות ציר ההתגלות (לגשר בין סט מספרים לאירועים)
export async function getTederStations() {
  if (!supabase) return [];
  const { data } = await supabase.from('teder_stations')
    .select('id,title,year,event_date,central_numbers,post_ref,description,sort_order,is_active')
    .eq('is_active', true).order('year', { ascending: false });
  return data || [];
}

// פירוט גלריה אחת — כל התמונות בסדר כרונולוגי (ordering) עם תיאורים.
export async function getGalleryDetail(galleryId) {
  if (!supabase || !galleryId) return [];
  const { data } = await supabase
    .from('gallery_images')
    .select('id,name,description,image_url,thumb_url,ordering,primary_value,all_values,occurred_at')
    .eq('gallery_id', galleryId)
    .not('curator_hidden', 'is', true)
    .eq('min_tier', 0)                                               // נראות: ציבורי בלבד
    .order('ordering', { ascending: true });
  return data || [];
}

// תמונות לפי ערך-ראשי (primary_value) — לקרוסלת רמזים בתוך פוסט. כרונולוגי (חדש→ישן).
export async function getImagesByPrimaryValue(value) {
  if (!supabase || !value) return [];
  const { data } = await supabase
    .from('gallery_images')
    .select('id,name,description,image_url,thumb_url,primary_value,all_values,occurred_at,created_at,importance')
    .eq('primary_value', value)
    .not('image_url', 'is', null)
    .not('curator_hidden', 'is', true)                              // אצירה: מוסתר לא מוצג
    .eq('min_tier', 0)                                               // נראות: פרימיום/מוסתר לא לציבור
    .order('importance', { ascending: false, nullsFirst: false })   // אצירה: המובחר ראשון
    .order('occurred_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  return data || [];
}

// תמונות לפי ערך מלא (primary_value או all_values) — למשפחת האפסים / מספרים בלי primary ייעודי.
export async function getImagesByValue(value) {
  if (!supabase || !value) return [];
  const { data } = await supabase
    .from('gallery_images')
    .select('id,name,description,image_url,thumb_url,primary_value,all_values,occurred_at,created_at,importance')
    .or(`primary_value.eq.${value},all_values.cs.{${value}}`)
    .not('image_url', 'is', null)
    .not('curator_hidden', 'is', true)
    .eq('min_tier', 0)                                               // נראות: ציבורי בלבד
    .order('importance', { ascending: false, nullsFirst: false })
    .order('occurred_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  return data || [];
}

// תמונות של גלריה אחת (wp_gallery_id) — לקרוסלה החיה בתוך פוסט (data-sod-gallery-id).
// עץ אחד: הפוסט הישן מפסיק להציג HTML קפוא ומצביע ל-gallery_images העריך —
// כך עריכת תאריך/חשיבות/הסתרה/מספר בגלריה משתקפת מיד בפוסט. ציבורי בלבד.
// סדר: חשיבות↓ ואז הסדר הידני של הגלריה (ordering) — שומר על הסדר הישן של צוריאל.
export async function getImagesByGallery(wpGalleryId) {
  if (!supabase || !wpGalleryId) return [];
  const { data } = await supabase
    .from('gallery_images')
    .select('id,name,description,image_url,thumb_url,ordering,primary_value,all_values,occurred_at,created_at,importance')
    .eq('wp_gallery_id', wpGalleryId)
    .not('image_url', 'is', null)
    .not('curator_hidden', 'is', true)
    .eq('min_tier', 0)                                               // נראות: פרימיום/מוסתר לא לציבור
    .order('importance', { ascending: false, nullsFirst: false })
    .order('ordering', { ascending: true, nullsFirst: false });
  return data || [];
}

// ===== דף הישות — איסוף כל המידע סביב מספר/ביטוי =====
// מחזיר ספירות + פריטים לכל מדור (פוסטים, גלריות, אירועים, תגובות, חידושי AI, מילים שוות).
export async function getEntityBundle({ term, value, isNumber }) {
  if (!supabase || !term) return null;
  const t = String(term).trim();
  const like = `%${t}%`;
  // שאילתה עם ספירה כוללת + פריטים מוגבלים, עטופה ב-try כדי שלא תפיל את שאר המדורים
  const sec = (table, cols, build) => {
    try {
      let q = supabase.from(table).select(cols, { count: 'exact' });
      q = build(q);
      return q.then(({ data, count }) => ({ items: data || [], count: count ?? (data?.length || 0) }))
              .catch(() => ({ items: [], count: 0 }));
    } catch { return Promise.resolve({ items: [], count: 0 }); }
  };

  // פוסטים — סינון מחמיר: עד 3 פוסטים, הכי רלוונטיים בלבד (לא הצפה).
  // למספר: RPC מדורג (כותרת > תגית-מספר). לטקסט: קודם הביטוי בכותרת, ורק להשלמה — מהתוכן.
  const postsP = isNumber
    ? supabase.rpc('posts_by_number_strict', { num: value, lim: 3 })
        .then(({ data }) => ({ items: data || [], count: (data || []).length }))
        .catch(() => ({ items: [], count: 0 }))
    : (async () => {
        try {
          const byTitle = await supabase.from('posts').select('wp_id,slug,title,date')
            .ilike('title', like).order('date', { ascending: false }).limit(3);
          const items = byTitle.data || [];
          if (items.length < 3) {
            const seen = new Set(items.map(p => p.wp_id));
            const byContent = await supabase.from('posts').select('wp_id,slug,title,date')
              .ilike('content', like).order('date', { ascending: false }).limit(6);
            for (const p of (byContent.data || [])) {
              if (!seen.has(p.wp_id)) { items.push(p); if (items.length >= 3) break; }
            }
          }
          return { items, count: items.length };
        } catch { return { items: [], count: 0 }; }
      })();

  const [phrases, posts, galleries, events, comments, insights] = await Promise.all([
    value
      ? supabase.from('gematria_words').select('phrase,ragil,is_verified,visibility_tier,lead_rank', { count: 'exact' })
          .eq('ragil', value)
          .order('lead_rank', { ascending: true, nullsFirst: false })   // 📌 נעוצים (חזקים) קודם
          .order('is_verified', { ascending: false })
          .order('visibility_tier', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false, nullsFirst: false }).limit(500)
          .then(({ data, count }) => ({ items: data || [], count: count ?? (data?.length || 0) }))
          .catch(() => ({ items: [], count: 0 }))
      : Promise.resolve({ items: [], count: 0 }),
    postsP,
    // גלריות: למספר — שתי שאילתות מדורגות כדי שתמונות *על* המספר (primary_value)
    // יגיעו תמיד תחילה, ואז אזכורים (all_values). סינון-הרלוונטיות נעשה בדף עצמו.
    isNumber ? (async () => {
      try {
        const cols = 'id,name,description,image_url,thumb_url,primary_value,gallery_id,all_values,occurred_at,created_at,importance';
        const ord = q => q.not('curator_hidden', 'is', true).eq('min_tier', 0)
          .order('importance', { ascending: false, nullsFirst: false })
          .order('occurred_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false });
        const [pr, sr] = await Promise.all([
          ord(supabase.from('gallery_images').select(cols).eq('primary_value', value)).limit(24),
          ord(supabase.from('gallery_images').select(cols, { count: 'exact' }).contains('all_values', [value])).limit(40),
        ]);
        const map = new Map();
        for (const g of (pr.data || [])) map.set(g.id, g);   // "על המספר" קודם
        for (const g of (sr.data || [])) if (!map.has(g.id)) map.set(g.id, g);
        const items = [...map.values()];
        return { items, count: sr.count ?? items.length };
      } catch { return { items: [], count: 0 }; }
    })() :
    sec('gallery_images', 'id,name,description,image_url,thumb_url,primary_value,gallery_id,all_values,occurred_at,created_at,importance',
      q => q.ilike('name', like)
            .not('curator_hidden', 'is', true)
            .order('importance', { ascending: false, nullsFirst: false })
            .order('occurred_at', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false }).limit(18)),
    // אירועים: רק לטקסט (למספר אין שדה מספרי בנודים — נמנע מרעש כמו 2026 עבור 26).
    isNumber ? Promise.resolve({ items: [], count: 0 }) :
      sec('nodes', 'id,label,hebrew_date,weight',
        q => q.eq('type', 'event').eq('is_active', true).ilike('label', like).order('weight', { ascending: false }).limit(12)),
    // תגובות: רק לטקסט (למספר תת-מחרוזת מייצרת רעש).
    isNumber ? Promise.resolve({ items: [], count: 0 }) :
      sec('comments', 'wp_id,post_wp_id,author_name,content,date',
        q => q.ilike('content', like).order('date', { ascending: false }).limit(8)),
    // חידושים: למספר — לפי related_numbers מדויק בלבד; לטקסט — לפי ביטוי + כותרת/גוף.
    sec('insights', 'id,title,body,source_ref,source_type,origin,related_numbers,related_phrases',
      q => (isNumber
        ? q.eq('is_active', true).contains('related_numbers', [value])
        : q.eq('is_active', true).or(`related_phrases.cs.{"${t}"},title.ilike.${like},body.ilike.${like}`)
      ).limit(12)),
  ]);

  return {
    term: t, value, isNumber, phrases: phrases.items, phrasesCount: phrases.count,
    posts: posts.items, postsCount: posts.count,
    galleries: galleries.items, galleriesCount: galleries.count,
    events: events.items, eventsCount: events.count,
    comments: comments.items, commentsCount: comments.count,
    insights: insights.items, insightsCount: insights.count,
  };
}

// ── Comments ──────────────────────────────────────────────
export async function getCommentsByPostId(postWpId) {
  if (!supabase || !postWpId) return [];
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('post_wp_id', postWpId)
    .order('date', { ascending: true });
  return data ?? [];
}

// כל התגובות מהאתר הישן, מקובצות תחת כל פוסט (לתצוגת ניהול)
export async function getOldSiteComments() {
  if (!supabase) return [];
  // PostgREST מגביל ~1000 שורות לבקשה — מושכים בעמודים
  async function fetchAll(table, cols, order) {
    const CH = 1000, out = [];
    for (let from = 0; ; from += CH) {
      let q = supabase.from(table).select(cols).range(from, from + CH - 1);
      if (order) q = q.order(order, { ascending: false });
      const { data } = await q;
      if (!data || !data.length) break;
      out.push(...data);
      if (data.length < CH) break;
    }
    return out;
  }
  const [cms, ps] = await Promise.all([
    fetchAll('comments', 'wp_id,post_wp_id,author_name,date,content', 'date'),
    fetchAll('posts', 'wp_id,title,slug', null),
  ]);
  const pmap = {};
  ps.forEach(p => { pmap[p.wp_id] = { title: p.title || '', slug: p.slug }; });
  const groups = new Map();
  for (const c of cms) {
    let g = groups.get(c.post_wp_id);
    if (!g) {
      g = { post_wp_id: c.post_wp_id, title: pmap[c.post_wp_id]?.title || `פוסט #${c.post_wp_id}`,
            slug: pmap[c.post_wp_id]?.slug || null, comments: [], latest: c.date };
      groups.set(c.post_wp_id, g);
    }
    g.comments.push(c);
    if (c.date > g.latest) g.latest = c.date;
  }
  return [...groups.values()].sort((a, b) => (a.latest < b.latest ? 1 : -1));
}

// ── Popular posts (by comment count) ──────────────────────
export async function getPopularPosts({ limit = 10 } = {}) {
  const { data } = await supabase.rpc('popular_posts_by_comments', { lim: limit });
  if (data?.length) return data;
  // fallback: most recent
  const { data: recent } = await supabase
    .from('posts').select('*').order('date', { ascending: false }).limit(limit);
  return recent ?? [];
}

// 👁 מעקב צפיות חי — שורה לכל צפייה (פעם אחת לכל ref בכל session, כדי לא לנפח).
export async function logView(kind, ref) {
  if (!supabase || !kind || ref == null || ref === "") return;
  const key = `pv-${kind}-${ref}`;
  try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
  try { await supabase.from("page_views").insert({ kind, ref: String(ref) }); } catch { /* ignore */ }
}
// 🔎 ספירת חיפושים כוללת (כל הזמן) למספר — מד קבוע "כמה פעמים חיפשו". מקור: search_log.
export async function getSearchCount(value) {
  if (!supabase || !value) return 0;
  const { count } = await supabase.from("search_log").select("*", { count: "exact", head: true }).eq("value", value);
  return count || 0;
}
// 🔎 סטטיסטיקת חיפושים של היום (לרצועת הטיקר): כמה חיפושים נעשו + כמה מילים ייחודיות נחקרו.
// מקור: search_log. ספירת החיפושים = exact head count; המילים = distinct מדגם (עד 2000 שורות).
export async function getSearchStatsToday() {
  if (!supabase) return { searches: 0, words: 0, total: 0 };
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const iso = start.toISOString();
  let searches = 0, words = 0, total = 0;
  try {
    const { count } = await supabase.from("search_log").select("*", { count: "exact", head: true }).gte("created_at", iso);
    searches = count || 0;
  } catch { /* ignore */ }
  let topNumber = null;
  try {
    const { data } = await supabase.from("search_log").select("term,value").gte("created_at", iso).limit(2000);
    words = new Set((data || []).map(r => (r.term || "").trim()).filter(Boolean)).size;
    const freq = {};
    for (const r of (data || [])) if (r.value != null) freq[r.value] = (freq[r.value] || 0) + 1;
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 2) topNumber = Number(top[0]);
  } catch { /* ignore */ }
  try {
    const { count } = await supabase.from("search_log").select("*", { count: "exact", head: true });
    total = count || 0;
  } catch { /* ignore */ }
  let month = 0;
  try {
    const m0 = new Date(); m0.setDate(1); m0.setHours(0, 0, 0, 0);
    const { count } = await supabase.from("search_log").select("*", { count: "exact", head: true }).gte("created_at", m0.toISOString());
    month = count || 0;
  } catch { /* ignore */ }
  return { searches, words, total, topNumber, month };
}
// 💎 כותרות הצלבות מאומתות-ציבוריות (לרצועת הטיקר). רק space='core' + verified=true —
// כך רמזי-גלם/מעבדה שלא אושרו לא דולפים לציבור. מחזיר עד `limit` (לגיוון ברוטציה).
export async function getVerifiedCrossTitles(limit = 3) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("insights")
      .select("title,created_at")
      .eq("is_active", true).eq("space", "core").eq("verified", true)
      .not("title", "is", null)
      .order("created_at", { ascending: false }).limit(limit);
    return (data || []).map(r => r.title).filter(Boolean);
  } catch { return []; }
}
// 📡 הודעות-טיקר ידניות — צוריאל שולט (טבלת ticker_messages). מוצגות ראשונות בטיקר.
// להוסיף: insert into ticker_messages(text,priority) · להסיר: update ... set is_active=false.
// 🫧 דופק-פעילות ציבורי (activity_pulse) — סוגי פעילות בשעה האחרונה, בלי תוכן (פרטיות).
export async function getActivityPulse() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.rpc("activity_pulse");
    if (error) return null;
    return data;
  } catch { return null; }
}

export async function getTickerMessages() {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("ticker_messages")
      .select("text").eq("is_active", true)
      .order("priority", { ascending: false }).order("created_at", { ascending: false }).limit(10);
    return (data || []).map(r => r.text).filter(Boolean);
  } catch { return []; }
}

// 📁 דף העבודה של המשתמש — שמירות פרטיות (הצלבות / צירי התכנסות). RLS: רק המשתמש עצמו.
export async function saveUserItem({ kind, ref, title, link, note }) {
  if (!supabase) return { error: "no-client" };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "auth" };
  const { error } = await supabase.from("user_saved_items")
    .insert({ user_id: user.id, kind, ref: ref != null ? String(ref) : null, title, link, note: note || null });
  return { error };
}
export async function getUserItems() {
  if (!supabase) return [];
  const { data } = await supabase.from("user_saved_items")
    .select("id,kind,ref,title,link,note,created_at").order("created_at", { ascending: false });
  return data || [];
}
export async function deleteUserItem(id) {
  if (!supabase) return { error: "no-client" };
  const { error } = await supabase.from("user_saved_items").delete().eq("id", id);
  return { error };
}

// 👣 ספירת כניסות היום (best-effort — אם RLS חוסם, מחזיר 0). מקור: site_visits.
export async function getVisitorsToday() {
  if (!supabase) return 0;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  try {
    const { count } = await supabase.from("site_visits").select("*", { count: "exact", head: true }).gte("ts", start.toISOString());
    return count || 0;
  } catch { return 0; }
}
// 👁 ספירת צפיות חיה לפריט יחיד (מספר/פוסט) בחלון ימים — למחוון "חם" בדף עצמו
export async function getViewCount(kind, ref, days = 7) {
  if (!supabase || ref == null || ref === "") return 0;
  const { data } = await supabase.rpc("view_count", { p_kind: kind, p_ref: String(ref), p_days: days });
  return Number(data) || 0;
}
// 🔥 פוסטים נצפים עכשיו (חי, לפי חלון ימים — היום=1, השבוע=7)
export async function getHotPostsLive({ days = 7, limit = 4 } = {}) {
  if (!supabase) return [];
  const { data } = await supabase.rpc("hot_posts_live", { days, lim: limit });
  return data || [];
}

// ── Contact ────────────────────────────────────────────────
export async function sendContactMessage({ name, email, subject, message }) {
  const { error } = await supabase.from('contact_messages').insert([{
    name: name.trim(), email: email.trim(),
    subject: subject.trim(), message: message.trim(),
  }]);
  if (error) throw error;
}

// ── Chat ───────────────────────────────────────────────────
export async function getChatMessages({ limit = 80 } = {}) {
  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).reverse();
}

export async function sendChatMessage({ author, content }) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{ author: author.trim(), content: content.trim() }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function subscribeToChatMessages(callback) {
  return supabase
    .channel('chat_messages')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
      callback(payload.new);
    })
    .subscribe();
}

// ── Traffic / Jetpack stats (legacy_traffic) ───────────────
// היסטוריית גלישה שיובאה מ-Jetpack/WordPress.com (ראה scripts/sync-jetpack-stats.mjs).
const TRAFFIC_SEL = 'post_id, title, url, views, period, source';

// PostgREST מגביל ~1000 שורות לבקשה — מושכים בעמודים עד שמתרוקן
async function fetchAllTraffic(source, orderCol, asc) {
  const PAGE = 1000;
  let from = 0, out = [];
  for (;;) {
    const { data, error } = await supabase
      .from('legacy_traffic').select(TRAFFIC_SEL)
      .eq('source', source).order(orderCol, { ascending: asc })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    out = out.concat(data ?? []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

export async function getTrafficStats() {
  const empty = { yearly: [], daily: [], posts: [], referrers: [], clicks: [], searches: [] };
  if (!supabase) return empty;
  const small = (source, col, asc) =>
    supabase.from('legacy_traffic').select(TRAFFIC_SEL).eq('source', source).order(col, { ascending: asc }).limit(200);
  const [daily, posts, yearlyR, refR, clickR, searchR] = await Promise.all([
    fetchAllTraffic('jetpack-daily', 'period', true),
    fetchAllTraffic('jetpack', 'views', false),
    small('jetpack-total', 'period', true),
    small('jetpack-referrer', 'views', false),
    small('jetpack-click', 'views', false),
    small('jetpack-search', 'views', false),
  ]);
  const bad = [yearlyR, refR, clickR, searchR].find(r => r.error);
  if (bad?.error) throw bad.error;
  const num = arr => (arr ?? []).map(x => ({ ...x, views: Number(x.views) || 0 }));
  return {
    yearly: num(yearlyR.data).map(r => ({ period: r.period, views: r.views })),
    daily: num(daily).map(r => ({ date: r.period, views: r.views })),
    posts: num(posts),
    referrers: num(refR.data),
    clicks: num(clickR.data),
    searches: num(searchR.data),
  };
}

// ── Subscribers (רשימת תפוצה) ──────────────────────────────
export async function subscribeEmail({ email, name = null, source = 'site' }) {
  if (!supabase || !email?.trim()) return { ok: false };
  const { error } = await supabase
    .from('subscribers')
    .insert([{ email: email.trim(), name: name?.trim() || null, source }]);
  if (error && !/duplicate|unique/i.test(error.message)) throw error;
  return { ok: true, duplicate: !!error };
}

// ── מרכז התראות — העדפות נושאים/ערוצים (notification_prefs) ──
// מקור אחד לכל הערוצים. שורה לכל זהות: userId (מחובר) או visitorId (אנונימי).
export async function getNotificationPrefs({ userId = null, visitorId = null } = {}) {
  if (!supabase) return null;
  let q = supabase.from('notification_prefs').select('topics, channels, email, intensity, muted_until');
  if (userId) q = q.eq('user_id', userId);
  else if (visitorId) q = q.eq('visitor_id', visitorId);
  else return null;
  const { data } = await q.maybeSingle();
  return data || null;
}

export async function saveNotificationPrefs({ userId = null, visitorId = null, topics = [], channels = [], email = null, intensity = undefined, mutedUntil = undefined }) {
  if (!supabase) return { ok: false };
  const row = { topics, channels, email: email || null, updated_at: new Date().toISOString() };
  if (intensity !== undefined) row.intensity = intensity;
  if (mutedUntil !== undefined) row.muted_until = mutedUntil;
  let res;
  if (userId) {
    row.user_id = userId;
    res = await supabase.from('notification_prefs').upsert(row, { onConflict: 'user_id' });
  } else if (visitorId) {
    row.visitor_id = visitorId;
    res = await supabase.from('notification_prefs').upsert(row, { onConflict: 'visitor_id' });
  } else return { ok: false };
  if (res.error) throw res.error;
  // בחר ערוץ מייל ויש כתובת → לוודא שהוא ברשימת התפוצה הקיימת (בלי כפילות, בלי מערכת מקבילה).
  if (channels.includes('email') && email) {
    try { await subscribeEmail({ email, source: 'notification-center' }); } catch { /* noop */ }
  }
  return { ok: true };
}

// תפר השדרוג (אנונימי → חשבון): כשמבקר מתחבר, "תובעים" את שורת ההעדפות שלו
// (visitor_id) ומקשרים אותה ל-user_id. מריצים בשתיקה בעת התחברות.
export async function claimVisitorPrefs(userId, visitorId) {
  if (!supabase || !userId || !visitorId) return;
  try {
    await supabase.from('notification_prefs')
      .update({ user_id: userId })
      .eq('visitor_id', visitorId)
      .is('user_id', null);
  } catch { /* silent */ }
}

// ── מונה שיתופים לפוסטים (הוכחה חברתית) ─────────────────────
export async function getShareCount(wpId) {
  if (!supabase || !wpId) return 0;
  const { data } = await supabase
    .from('post_share_counts')
    .select('count')
    .eq('wp_id', wpId)
    .maybeSingle();
  return data?.count ?? 0;
}

export async function incrementShareCount(wpId) {
  if (!supabase || !wpId) return null;
  const { data, error } = await supabase.rpc('increment_post_share', { p_wp_id: wpId });
  if (error) return null;
  return data;  // הערך החדש של המונה
}

// מנוי Realtime למונה השיתופים של פוסט — מתעדכן חי כשמישהו משתף
export function subscribeShareCount(wpId, cb) {
  if (!supabase || !wpId) return () => {};
  const ch = supabase
    .channel(`share_count_${wpId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'post_share_counts', filter: `wp_id=eq.${wpId}` },
      payload => { const n = payload?.new?.count; if (typeof n === 'number') cb(n); })
    .subscribe();
  return () => { try { supabase.removeChannel(ch); } catch { /* noop */ } };
}

// ── תיעוד פעילות משתמשים מחוברים (פילוח עתידי + מבקר חוזר) ──
// שקט ולא חוסם: רושם רק למשתמש מחובר (RLS), נכשל בשתיקה אם אין session.
export async function logActivity(kind, ref = null, title = null) {
  if (!supabase || !kind) return;
  try {
    // רק למשתמש מחובר: RLS דורש user_id=auth.uid(); אנונימי חסום (היה מפיל permission-denied בלוג).
    // בעבר לא הועבר user_id כלל → נכשל גם למחוברים (with_check user_id=auth.uid() על null).
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return;
    await supabase.from('user_activity').insert({ user_id: uid, kind, ref, title: title ? String(title).slice(0, 200) : null });
  } catch { /* silent */ }
}

// מטא-דאטה קל לכמה פוסטים לפי wp_id (בלי עמודת content הכבדה) — לכרטיסים/תצוגות
export async function getPostsMetaByWpIds(wpIds = []) {
  if (!supabase || !wpIds.length) return [];
  const { data } = await supabase.from('posts').select('wp_id, slug, title, image_url').in('wp_id', wpIds);
  return data || [];
}

// מוני שיתופים למספר פוסטים בבת אחת → מפה { wp_id: count }
export async function getShareCounts(wpIds = []) {
  if (!supabase || !wpIds.length) return {};
  const { data } = await supabase.from('post_share_counts').select('wp_id, count').in('wp_id', wpIds);
  const map = {};
  (data || []).forEach(r => { map[r.wp_id] = r.count; });
  return map;
}

// ── Admin inbox (הודעות + מנויים) — מאחורי סיסמת ניהול בצד-שרת ──
export async function getAdminInbox(key) {
  const empty = { messages: [], subscribers: [], unread: 0, subscriber_count: 0 };
  if (!supabase) return empty;
  const { data, error } = await supabase.rpc('admin_inbox', { p_key: key });
  if (error) throw error;
  return data || empty;
}

export async function markMessageRead(key, id, read = true) {
  if (!supabase) return;
  const { error } = await supabase.rpc('admin_mark_message_read', { p_key: key, p_id: id, p_read: read });
  if (error) throw error;
}

// ── פאנל ניהול חדש (מבוסס role=admin דרך RLS) ──
export async function adminGetMessages() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('contact_messages')
    .select('id,name,email,subject,message,created_at,read').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function adminSetMessageRead(id, read = true) {
  if (!supabase) throw new Error('no supabase');
  const { error } = await supabase.from('contact_messages').update({ read }).eq('id', id);
  if (error) throw error;
}
export async function adminGetSubscribers() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('subscribers')
    .select('id,email,name,source,active,created_at').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// עדכון ידני של פוסט בידי מנהל (כותרת / תוכן / תקציר). מסמן modified=עכשיו.
export async function adminUpdatePost(id, fields = {}) {
  if (!supabase) throw new Error('no supabase');
  if (id == null) throw new Error('no post id');
  const allowed = {};
  for (const k of ['title', 'content', 'excerpt']) {
    if (k in fields) allowed[k] = fields[k];
  }
  allowed.modified = new Date().toISOString();
  const { data, error } = await supabase
    .from('posts').update(allowed).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  return data;
}

// ── OCR גלריות (Edge Function gallery-ocr — Claude Vision) ──
export async function getOcrCounts() {
  if (!supabase) return { total: 0, done: 0, pending: 0, error: 0, other: 0 };
  const c = { total: 0, done: 0, pending: 0, error: 0, other: 0 };
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from('gallery_images').select('ocr_status').range(from, from + 999);
    if (!data || !data.length) break;
    for (const r of data) { c.total++; const k = r.ocr_status; if (k === 'done' || k === 'pending' || k === 'error') c[k]++; else c.other++; }
    if (data.length < 1000) break;
  }
  return c;
}
export async function runOcrBatch({ limit = 50, retry = false, runKey = '' } = {}) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.functions.invoke('gallery-ocr', {
    body: { limit, retry_errors: retry },
    ...(runKey ? { headers: { 'x-run-key': runKey } } : {}),
  });
  if (error) throw error;
  return data; // { picked, done, errors, sample }
}

// ===== כרטיסי נושא (topic_cards) — חיבורים/הצטלבויות שה-AI מכין והאדמין מאשר =====
export async function getTopicCards({ approvedOnly = false } = {}) {
  if (!supabase) return [];
  let q = supabase.from('topic_cards').select('*')
    .order('quality', { ascending: false }).order('created_at', { ascending: false });
  if (approvedOnly) q = q.eq('status', 'approved');
  const { data } = await q;
  return data || [];
}
// 🔡 צפנים — ממצאי «הצופן» (nodes type=convergence, חוצי-שפה/שיטה): 86=אלהים=הטבע, בן=son=sun…
// מוצגים ב«היכל הגילוי» לצד ההתכנסויות (topic_cards). עדשה על הגרף — לא טבלה חדשה.
export async function getCipherFindings(limit = 8) {
  if (!supabase) return [];
  const { data } = await supabase.from('nodes')
    .select('id,label,metadata,created_at')
    .eq('type', 'convergence').eq('is_active', true)
    .order('created_at', { ascending: false }).limit(40);
  return (data || [])
    .filter(n => n.metadata && (n.metadata.kind === 'cross-language' || n.metadata.lang))
    .slice(0, limit)
    .map(n => ({
      t: String(n.label || '').replace(/^\s*\d+\s*[—–-]\s*/, '').trim(),
      num: (n.metadata.numbers || [])[0] ?? null,
      slug: n.metadata.slug || null,
      by: n.metadata.discovered_by || null,
      created_at: n.created_at,
    }));
}
// אירועי ציר ההתגלות (nodes type=event) — לשימוש ב"מהארכיון" בדף הבית
export async function getAxisEvents(limit = 24) {
  if (!supabase) return [];
  const { data } = await supabase.from('nodes')
    .select('id,label,weight,hebrew_date,metadata')
    .eq('type', 'event').eq('is_active', true)
    .order('weight', { ascending: false }).limit(limit);
  return data || [];
}
export async function getTopicCardBySlug(slug) {
  if (!supabase || !slug) return null;
  const { data } = await supabase.from('topic_cards').select('*').eq('slug', slug).maybeSingle();
  return data || null;
}
// ישויות (זהב/חתימות) המחוברות לציר ההתכנסות בגרף — דרך edges related מה-node של הכרטיס
export async function getConvergenceEntities(nodeId) {
  if (!supabase || !nodeId) return [];
  const { data: eg } = await supabase.from('edges').select('to_node').eq('from_node', nodeId).eq('relation_type', 'related');
  const ids = [...new Set((eg || []).map(x => x.to_node))];
  if (!ids.length) return [];
  const { data } = await supabase.from('nodes').select('label,description,metadata').eq('type', 'entity').in('id', ids);
  return (data || []).sort((a, b) => (b.metadata?.tier === 'gold' ? 1 : 0) - (a.metadata?.tier === 'gold' ? 1 : 0));
}

// ===== אצירת תמונות — דירוג (importance) + הסתרה (curator_hidden). מיון: חזק קודם, ואז תאריך =====
export async function searchGalleryForCuration(term = '', { limit = 60 } = {}) {
  if (!supabase) return [];
  let q = supabase.from('gallery_images')
    .select('id,image_url,name,ocr_numbers,occurred_at,importance,curator_hidden,source')
    .not('image_url', 'is', null);
  const t = (term || '').trim();
  if (t) {
    // מספר → אותו סט בדיוק שמוצג בתצוגות (primary_value / all_values), כדי שמה
    // שתאצור פה ישפיע ישירות על כל הגלריות של אותו מספר.
    if (/^\d+$/.test(t)) { const num = parseInt(t, 10); q = q.or(`primary_value.eq.${num},all_values.cs.{${num}}`); }
    else q = q.or(`ocr_text.ilike.%${t}%,name.ilike.%${t}%`);
  }
  q = q.order('importance', { ascending: false })
       .order('occurred_at', { ascending: false, nullsFirst: false })
       .limit(limit);
  const { data } = await q;
  return data || [];
}
// חיפוש OCR בצד-שרת — מחזיר ids תואמים (במקום לטעון את כל ה-ocr_text מראש)
export async function searchArchiveOcrIds(q, { limit = 800 } = {}) {
  if (!supabase || !q || q.trim().length < 2) return [];
  const t = q.trim();
  const { data } = await supabase.from('gallery_images')
    .select('id,gallery_id')
    .or(`ocr_text.ilike.%${t}%,name.ilike.%${t}%,description.ilike.%${t}%`)
    .limit(limit);
  return data || [];
}
export async function setImageCuration(id, patch) {
  if (!supabase) throw new Error('no supabase');
  // 🌊 «הוסף לזרם» (source=update) → חותמת stream_at=עכשיו כך שהתמונה קופצת לראש הזרם (גם ישנה).
  const p = patch.source === 'update' ? { ...patch, stream_at: new Date().toISOString() } : patch;
  const { data, error } = await supabase.from('gallery_images')
    .update(p).eq('id', id).select('id,importance,curator_hidden,source,stream_at,treasure').maybeSingle();
  if (error) throw error;
  invalidateGalleriesOverview();
  return data;
}

// 🖼️ העלאת/החלפת קובץ-תמונה פיזי ל-bucket 'gallery' → מחזיר URL ציבורי (מנהל בלבד, RLS).
export async function uploadGalleryImage(file) {
  if (!supabase) throw new Error('no supabase');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `sod1820/replaced/${Date.now()}-${Math.round(Math.random() * 1e5)}.${ext}`;
  const { error } = await supabase.storage.from('gallery').upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('gallery').getPublicUrl(path).data.publicUrl;
}
// 🌊 הזזת רמז בזרם (אדמין): מחליפים את חותמות-הזמן האפקטיביות של שני רמזים שכנים —
// הסדר בזרם נקבע לפי stream_at (עם נפילה ל-created_at), אז החלפה = החלפת מיקום.
// dir: 'up' | 'down' — אם החותמות שוות, מזיזים שנייה אחת כדי שההחלפה תיתפס.
export async function swapStreamOrder(a, b, dir = 'up') {
  if (!supabase) throw new Error('no supabase');
  const eff = h => h.stream_at || h.created_at || new Date().toISOString();
  let ta = eff(a), tb = eff(b);
  if (ta === tb) ta = new Date(new Date(tb).getTime() + (dir === 'up' ? -1000 : 1000)).toISOString();
  const { error: e1 } = await supabase.from('gallery_images').update({ stream_at: tb }).eq('id', a.id);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from('gallery_images').update({ stream_at: ta }).eq('id', b.id);
  if (e2) throw e2;
  invalidateGalleriesOverview();
  return { [a.id]: tb, [b.id]: ta };   // id → stream_at החדש (לעדכון מצב מקומי)
}

// הסתרה/הצגה מרובה (אדמין) — עדכון curator_hidden לרשימת מזהים בבת אחת
export async function bulkSetCuratorHidden(ids, hidden) {
  if (!supabase || !ids?.length) return [];
  const { data, error } = await supabase.from('gallery_images')
    .update({ curator_hidden: !!hidden }).in('id', ids).select('id');
  if (error) throw error;
  invalidateGalleriesOverview();
  return data || [];
}
// השורה המלאה של תמונה לפי id — "עץ אחד": העורך מושך את כל השדות (תגיות/מספרים/הגדרות)
// גם אם נפתח ממקור שמביא רק חלק מהשדות (קרוסלה/עדכונים/חיפוש).
export async function getGalleryImageFull(id) {
  if (!supabase || !id) return null;
  try {
    const { data } = await supabase.from('gallery_images')
      .select('id,image_url,thumb_url,name,description,primary_value,all_values,occurred_at,created_at,importance,image_type,source,curator_hidden,tags,ocr_status,ocr_numbers,treasure')
      .eq('id', id).maybeSingle();
    return data || null;
  } catch { return null; }
}
export async function setTopicCardStatus(id, status) {  if (!supabase) throw new Error('no supabase');
  const patch = { status };
  if (status === 'approved') patch.approved_at = new Date().toISOString();
  const { data, error } = await supabase.from('topic_cards')
    .update(patch).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}
export async function updateTopicCard(id, patch) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.from('topic_cards')
    .update(patch).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}
// מיזוג טופיקים: מאחד image_ids/numbers/highlight/bullets לתוך כרטיס-היעד, ומסמן את האחרים status='merged'
export async function mergeTopicCards(keepId, mergeIds = []) {
  if (!supabase || !keepId || !mergeIds.length) throw new Error('bad args');
  const ids = [keepId, ...mergeIds];
  const { data: cards } = await supabase.from('topic_cards').select('*').in('id', ids);
  const keep = (cards || []).find(c => c.id === keepId);
  const others = (cards || []).filter(c => c.id !== keepId);
  if (!keep) throw new Error('keep not found');
  const uniq = arr => [...new Set(arr.filter(x => x != null))];
  const merged = {
    image_ids: uniq([...(keep.image_ids || []), ...others.flatMap(c => c.image_ids || [])]),
    numbers: uniq([...(keep.numbers || []), ...others.flatMap(c => c.numbers || [])]),
    highlight_numbers: uniq([...(keep.highlight_numbers || []), ...others.flatMap(c => c.highlight_numbers || [])]),
    search_terms: uniq([...(keep.search_terms || []), ...others.flatMap(c => c.search_terms || [])]),
    findings: { ...(keep.findings || {}),
      bullets: [...((keep.findings || {}).bullets || []), ...others.flatMap(c => (c.findings || {}).bullets || [])] },
  };
  const { error: e1 } = await supabase.from('topic_cards').update(merged).eq('id', keepId);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from('topic_cards').update({ status: 'merged' }).in('id', mergeIds);
  if (e2) throw e2;
  return merged;
}
export async function getGalleryImagesByIds(ids = []) {
  if (!supabase || !ids.length) return [];
  const { data } = await supabase.from('gallery_images')
    .select('id,image_url,name,description,ocr_numbers,occurred_at,gallery_id,primary_value,all_values').in('id', ids);
  return data || [];
}
// 🕸️ עץ-קשרים ממוקד-מספר: ההתכנסויות שהמספר שייך אליהן (כל אחת מכילה את
// המספרים האחרים שמתכנסים יחד). זה הגרף האמיתי — חוט בין מספר↔התכנסות↔מספר.
export async function getNumberGraph(value) {
  const n = Number(value);
  if (!supabase || !Number.isFinite(n)) return { value: n, convergences: [] };
  const { data } = await supabase.from('nodes')
    .select('id,label,description,metadata')
    .eq('type', 'convergence').eq('is_active', true)
    .contains('metadata', { numbers: [n] });
  return { value: n, convergences: data || [] };
}
// מנוע "צידה": לכל תמונה — אילו מספרים שלה חוזרים במקומות אחרים ובאילו סטים
export async function getImageConnections(imageId) {
  if (!supabase || !imageId) return null;
  const { data, error } = await supabase.rpc('image_connections', { p_image_id: imageId });
  if (error) throw error;
  return data; // { image_id, image_url, numbers, connections:[{number, images, sets}] }
}
export async function findGalleryImages(term, limit = 10) {
  if (!supabase || !term) return [];
  const { data } = await supabase.from('gallery_images')
    .select('id,image_url,name,ocr_numbers')
    .or(`image_url.ilike.%${term}%,ocr_text.ilike.%${term}%`)
    .not('image_url', 'is', null).limit(limit);
  return data || [];
}

// ===== כפתור «הוסף לזרם» — מכל הגלריות ל-source='update' =====
export async function getGalleriesForStreamPicker({ limit = 300, search = "" } = {}) {
  if (!supabase) return [];
  let q = supabase.from('gallery_images')
    .select('id,image_url,name,primary_value,all_values,occurred_at,source,gallery_id')
    .not('image_url', 'is', null)
    .not('source', 'eq', 'update')
    .not('curator_hidden', 'is', true);
  if (search.trim()) {
    const t = search.trim();
    if (/^\d+$/.test(t)) { const n = parseInt(t, 10); q = q.or(`primary_value.eq.${n},all_values.cs.{${n}}`); }
    else q = q.or(`name.ilike.%${t}%,ocr_text.ilike.%${t}%`);
  }
  const { data } = await q
    .order('occurred_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ===== ניהול תמונות — עריכה ומחיקה =====

// בדיקת חיבורים לפני מחיקת תמונה — מחזיר רשימת מקומות שהתמונה מופיעה בהם.
export async function checkImageConnections(imageId, imageUrl) {
  if (!supabase) return [];
  const refs = [];
  try {
    const { data: topics } = await supabase
      .from('topic_cards')
      .select('id,title')
      .contains('image_ids', [imageId])
      .limit(10);
    if (topics?.length) refs.push(...topics.map(t => ({ type: 'topic', label: t.title || 'התכנסות ללא שם' })));
  } catch {}
  try {
    if (imageUrl) {
      const { data: posts } = await supabase
        .from('posts')
        .select('wp_id,title,slug')
        .eq('image_url', imageUrl)
        .limit(10);
      if (posts?.length) refs.push(...posts.map(p => ({ type: 'post', label: p.title || p.slug || 'פוסט' })));
    }
  } catch {}
  try {
    const { data: ins } = await supabase
      .from('insights')
      .select('id,title')
      .eq('source_ref', String(imageId))
      .limit(10);
    if (ins?.length) refs.push(...ins.map(i => ({ type: 'insight', label: i.title || 'חידוש' })));
  } catch {}
  return refs;
}

// מחיקת תמונה מ-gallery_images (מחיקה מוחלטת — מנהל בלבד).
export async function deleteGalleryImage(id) {
  if (!supabase) throw new Error('no supabase');
  const { error } = await supabase.from('gallery_images').delete().eq('id', id);
  if (error) throw error;
  invalidateGalleriesOverview();
}

export async function addImageToRealityStream(id, occurredAt = null) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.from('gallery_images')
    .update({ source: 'update', occurred_at: occurredAt ?? new Date().toISOString() })
    .eq('id', id)
    .select('id').single();
  if (error) throw error;
  return data;
}

// גלריה ציבורית — כל התמונות עם פילטר סוג + חיפוש + פגינציה
// hidden: 'no' = רק גלויות (ברירת מחדל) · 'only' = רק מוסתרות (אדמין) · 'all' = הכל (אדמין)
export async function getGalleryPage({ type = null, page = 0, limit = 60, search = "", hidden = "no" } = {}) {
  if (!supabase) return { data: [], count: 0 };
  let q = supabase.from('gallery_images')
    .select('id,name,description,image_url,thumb_url,primary_value,all_values,occurred_at,image_type,source,importance,curator_hidden', { count: 'exact' })
    .not('image_url', 'is', null);
  if (hidden === 'only') q = q.eq('curator_hidden', true);
  else if (hidden !== 'all') q = q.not('curator_hidden', 'is', true);
  if (type) q = q.eq('image_type', type);
  if (search.trim()) {
    const t = search.trim();
    if (/^\d+$/.test(t)) { const n = parseInt(t, 10); q = q.or(`primary_value.eq.${n},all_values.cs.{${n}}`); }
    else q = q.or(`name.ilike.%${t}%,description.ilike.%${t}%`);
  }
  const { data, count, error } = await q
    .order('occurred_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);
  if (error) return { data: [], count: 0 };
  return { data: data || [], count: count || 0 };
}
export async function createTopicCardDraft(card) {
  if (!supabase) throw new Error('no supabase');
  const { data, error } = await supabase.from('topic_cards')
    .insert({ ...card, status: 'draft', created_by: 'admin-hunt' }).select().maybeSingle();
  if (error) throw error;
  return data;
}

// ===== קיר הגימטריה החי (ניסוי ויראלי) — gematria_wall =====
// כל מילה/שם שגולש מחשב נרשם כאן דרך RPC מאובטח (sanitize + dedup + מונה).
export async function addWallWord(phrase, ragil) {
  if (!supabase || !phrase || !ragil) return;
  try { await supabase.rpc('add_wall_word', { p_phrase: String(phrase).trim(), p_ragil: ragil }); }
  catch { /* שקט — לוג בלבד, לא לשבור את החישוב */ }
}
// שמירה פרטית (אדמין): נשמרת עם private=true — לעולם לא מוצגת בקיר הציבורי.
export async function saveWallWordPrivate(phrase, ragil) {
  if (!supabase || !phrase || !ragil) return;
  try { await supabase.rpc('save_wall_word_private', { p_phrase: String(phrase).trim(), p_ragil: ragil }); }
  catch { /* שקט */ }
}
// הקיר הפרטי של האדמין — רק המילים שסומנו private.
export async function getWallPrivate(limit = 60) {
  if (!supabase) return [];
  const { data } = await supabase.from('gematria_wall')
    .select('phrase,ragil,hits,last_at').eq('private', true)
    .order('last_at', { ascending: false }).limit(limit);
  return data || [];
}
// 🛟 שכבת "מציל" — מילה שנכשלה במבחן הכתיב המבני אבל קיימת במאגר gematria_words
// מסומנת recognized=true כדי שתוצג במלואה. לעולם רק מוסיף (מציל מילה אמיתית נדירה),
// אף פעם לא חוסם מילה תקינה — מילים איכותיות שלא במאגר ממשיכות להופיע כרגיל.
async function rescueFromCorpus(rows) {
  if (!rows.length) return rows;
  const suspect = [...new Set(rows.filter(r => !isReadable(r.phrase)).map(r => r.phrase))];
  if (!suspect.length) return rows;
  const { data } = await supabase.from('gematria_words').select('phrase').in('phrase', suspect);
  const known = new Set((data || []).map(d => d.phrase));
  return known.size ? rows.map(r => known.has(r.phrase) ? { ...r, recognized: true } : r) : rows;
}
export async function getWallRecent(limit = 60) {
  if (!supabase) return [];
  const { data } = await supabase.from('gematria_wall')
    .select('phrase,ragil,hits,last_at').eq('private', false).order('last_at', { ascending: false }).limit(limit);
  return rescueFromCorpus(data || []);
}
export async function getWallPopular(limit = 60) {
  if (!supabase) return [];
  const { data } = await supabase.from('gematria_wall')
    .select('phrase,ragil,hits').eq('private', false).order('hits', { ascending: false }).limit(limit);
  return rescueFromCorpus(data || []);
}
export async function getWallCount() {
  if (!supabase) return 0;
  const { count } = await supabase.from('gematria_wall').select('*', { count: 'exact', head: true }).eq('private', false);
  return count || 0;
}

export function adaptPost(row) {
  return {
    id: row.wp_id,
    title: { rendered: row.title },
    excerpt: { rendered: row.excerpt ?? '' },
    date: row.date,
    modified: row.modified ?? row.date,
    link: row.link,
    slug: row.slug,
    author: row.author ?? '',
    source: row.source ?? null,
    _embedded: {
      'wp:featuredmedia': row.image_url ? [{ source_url: row.image_url }] : [],
      'wp:term': [
        (row.categories ?? []).map(name => ({ taxonomy: 'category', id: name, name })),
        (row.tags ?? []).map(name => ({ taxonomy: 'post_tag', id: name, name })),
      ],
    },
  };
}

// ===== פס פעילות חי (LiveActivityBar) — עדכונים אמיתיים בלבד =====
// ניקוי כותרת (תגיות HTML + ישויות נפוצות) לתצוגה בפס.
function cleanTitle(s) {
  return String(s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&#8211;/g, '–').replace(/&#8217;/g, '’').replace(/&#8220;|&#8221;/g, '"')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .trim();
}

const SEARCH_TERM_OK = /^[ 0-9א-ת׳״'"\-]{1,40}$/;
// תיעוד חיפוש אמיתי (מהמחשבון / דף הביטוי). ללא PII; נכשל בשקט. דדופ לכל גלישה.
export async function logSearch(term, value) {
  if (isAnon()) return;   // 🕶️ מצב אנונימי — לא נשמר בהיסטוריית החיפושים
  const t = (term || '').trim();
  if (!SEARCH_TERM_OK.test(t)) return;
  try {
    const key = 'sl:' + t;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch { /* ignore */ }
  try { await supabase.from('search_log').insert({ term: t, value: Number.isFinite(value) ? value : null }); } catch { /* ignore */ }
  // 🌳 עץ אישי: חיפוש של משתמש מחובר → research_items (bucket 'searched'). מכבד מצב-אנונימי (יצא למעלה).
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (uid) {
      const type = /^\d+$/.test(t) ? 'number' : 'phrase';
      const link = `/number/${encodeURIComponent(t)}`;
      const ent = { id: `${type}:${t}`, type, title: t, ref: t, link, metadata: {}, addedAt: Date.now() };
      await supabase.from('research_items').upsert(
        { user_id: uid, bucket: 'searched', entity_type: type, entity_ref: t, title: t, link, metadata: ent, created_at: new Date().toISOString() },
        { onConflict: 'user_id,bucket,entity_type,entity_ref' }
      );
    }
  } catch { /* ignore */ }
  // היסטוריה אישית (פר-משתמש) — לתצוגת "חיפושים אחרונים" בפרופיל. RLS דואג לבעלות.
  try { logActivity('gematria', t, Number.isFinite(value) ? String(value) : null); } catch { /* ignore */ }
}

// 🕒 היסטוריית פעילות אישית (פר-משתמש, RLS) — חיפושים אחרונים / פוסטים שנגלשו.
// kinds: מערך סוגים (למשל ['gematria'] או ['post']). מחזיר רשומות אחרונות, דדופ לפי ref.
export async function getUserActivity(kinds = [], limit = 8) {
  if (!supabase || !kinds.length) return [];
  try {
    const { data } = await supabase.from('user_activity')
      .select('kind, ref, title, created_at')
      .in('kind', kinds)
      .order('created_at', { ascending: false })
      .limit(120);
    const seen = new Set(); const out = [];
    for (const r of (data || [])) {
      const k = (r.ref || '') + '|' + r.kind;
      if (!r.ref || seen.has(k)) continue;
      seen.add(k); out.push(r);
      if (out.length >= limit) break;
    }
    return out;
  } catch { return []; }
}

// 🚪 שער היום — נבחר דטרמיניסטית לפי היום בשנה מתוך חידושי ההצלבות המככבים (כולם רואים אותו שער).
export function dayOfYear() {
  const now = new Date();
  return Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 86400000);
}

// 🕒 פיד חיפושים מאוחד — מקור אחד (search_log) עם דרגות לפי משתמש.
// אנונימי: 3 · רשום: 3 ימים · מנוי: 30 יום · אדמין: הכל.
const SEARCH_TIERS = {
  anon:  { days: 2,    limit: 3 },
  user:  { days: 3,    limit: 50 },
  sub:   { days: 30,   limit: 200 },
  admin: { days: 3650, limit: 600 },
};
export async function getSearchFeed(tier = 'anon') {
  try {
    const t = SEARCH_TIERS[tier] || SEARCH_TIERS.anon;
    let q = supabase.from('search_log').select('term,value,created_at').order('created_at', { ascending: false });
    if (t.days) q = q.gte('created_at', new Date(Date.now() - t.days * 86400000).toISOString());
    const { data } = await q.limit(Math.min(800, t.limit * 4));
    const seen = new Set(); const out = [];
    for (const r of (data || [])) {
      const term = (r.term || '').trim();
      if (!term || seen.has(term)) continue;
      seen.add(term); out.push({ term, value: r.value, at: r.created_at });
      if (out.length >= t.limit) break;
    }
    return out;
  } catch { return []; }
}

// ➕ אדמין: הוספת מילה מהחיפושים למאגר הראשי (ערכים מהמנוע המאומת).
export async function adminAddWord(phrase, vals) {
  try {
    const { data, error } = await supabase.rpc('admin_add_word', { p_phrase: phrase, p_vals: vals });
    if (error) return 'error';
    return data || 'error';
  } catch { return 'error'; }
}

// 🕒 חיפושים אחרונים — מה *כל* הגולשים חוקרים עכשיו (terms ייחודיים אחרונים).
export async function getRecentSearches(limit = 6) {
  try {
    const { data } = await supabase.from('search_log')
      .select('term,value,created_at')
      .order('created_at', { ascending: false }).limit(60);
    const seen = new Set(); const out = [];
    for (const r of (data || [])) {
      const t = (r.term || '').trim();
      if (!t || seen.has(t)) continue;
      seen.add(t); out.push({ term: t, value: r.value, at: r.created_at });
      if (out.length >= limit) break;
    }
    return out;
  } catch { return []; }
}

// 🔢 מונה חיפושים — כמה חיפושי גימטריה נרשמו ב-N השעות האחרונות (למגירת המספר / בית המדרש).
export async function getRecentSearchCount(hours = 24) {
  if (!supabase) return 0;
  try {
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { count } = await supabase.from('search_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since);
    return count || 0;
  } catch { return 0; }
}

// ✦ חידושי הצלבות — מהמנוע (origin=ai), החדשים ראשונים. למהבהב "כמה נוספו" ולקופסת הבית.
export async function getRecentCrosses(limit = 12) {
  try {
    const { data } = await supabase.from('insights')
      .select('id,title,body,related_numbers,method_tags,convergence_score,panel_data,gematria_pairs,verified,created_at')
      .eq('category', 'הצלבות').eq('is_active', true)
      .order('created_at', { ascending: false }).limit(limit);
    return data || [];
  } catch { return []; }
}

// 🧪 מעבדת צוריאל — שכבת חקירה (insights space='lab'): חידושים חזקים/מבניים שטרם עברו שרשרת הוכחה מלאה.
export async function getLabInsights(limit = 80) {
  if (!supabase) return [];
  try {
    const { data } = await supabase.from('insights')
      .select('id,title,body,category,related_numbers,related_phrases,evidence_level,origin,tags,created_at')
      .eq('space', 'lab').eq('is_active', true)
      .order('created_at', { ascending: false }).limit(limit);
    return data || [];
  } catch { return []; }
}

// 🧬 כל המילים-השוות ברגיל לערך (לכפתור «פתח עוד» — הרשימה המלאה). ממוין לפי חוזק
// (lead_rank › מאומת › visibility_tier › recency) — אותו סדר כמו story-top, ונושא שדות-חוזק
// לכלי הסידור. עד 500. כל פריט: {phrase, is_verified, visibility_tier, lead_rank}.
export async function getAllValuePhrases(value, limit = 500) {
  if (!supabase || !value) return [];
  try {
    const { data } = await supabase.from("gematria_words")
      .select("phrase,is_verified,visibility_tier,lead_rank")
      .eq("ragil", Number(value))
      // סדר קנוני זהה לדף המספר (getEntityBundle) — lead_rank › מאומת › visibility_tier › recency.
      // כך המחשבון המקצועי וכל צרכן אחר מסונכרנים 1:1 עם מה שצוריאל מסדר בדף המספר.
      .order("lead_rank", { ascending: true, nullsFirst: false })
      .order("is_verified", { ascending: false })
      .order("visibility_tier", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(limit);
    // ייחוד לפי ביטוי (יכולות להיות כפילויות ב-gematria_words)
    const seen = new Set(), out = [];
    for (const r of (data || [])) { if (r.phrase && !seen.has(r.phrase)) { seen.add(r.phrase); out.push(r); } }
    return out;
  } catch { return []; }
}

// 🧬 משפחות המילים — לכל ערך, הביטויים השווים לו בכל שיטה (מ-bidim) + העולם של כל ביטוי (מ-nodes).
// המקום היחיד למילים שוות בדף המספר (כולל רגיל). כל פריט: {phrase, world}.
export async function getValueFamilies(value, perMethod = 20) {
  if (!supabase || !value || value < 1) return [];
  try {
    const { data } = await supabase.from('bidim').select('method,phrase,priority').eq('value', value).limit(2500);
    if (!data || !data.length) return [];
    // קבוצות לפי שיטה — סופרים הכל אבל שומרים רק את ה-top שמוצג (perMethod).
    const groups = {};
    for (const r of data) {
      const g = (groups[r.method] ||= { method: r.method, priority: r.priority ?? 9, all: new Set(), top: [] });
      if (!g.all.has(r.phrase)) { g.all.add(r.phrase); if (g.top.length < perMethod) g.top.push(r.phrase); }
    }
    // ⚡ מעשירים (עולם+ערך-רגיל) רק את הביטויים שמוצגים — לא את כל 2,500 — ובמקביל.
    const shown = [...new Set(Object.values(groups).flatMap(g => g.top))];
    const worldMap = {}, ragilMap = {};
    const chunks = [];
    for (let i = 0; i < shown.length; i += 300) chunks.push(shown.slice(i, i + 300));
    await Promise.all(chunks.map(async chunk => {
      const [{ data: ents }, { data: gw }] = await Promise.all([
        supabase.from('nodes').select('label,metadata').eq('type', 'entity').in('label', chunk).limit(1000),
        supabase.from('gematria_words').select('phrase,ragil').in('phrase', chunk).limit(1000),
      ]);
      (ents || []).forEach(n => { const w = n.metadata?.world; if (w && !worldMap[n.label]) worldMap[n.label] = w; });
      (gw || []).forEach(r => { if (r.ragil != null && ragilMap[r.phrase] == null) ragilMap[r.phrase] = r.ragil; });
    }));
    return Object.values(groups)
      .map(g => ({ method: g.method, priority: g.priority, count: g.all.size,
        phrases: g.top.map(p => ({ phrase: p, world: worldMap[p] || null, ragil: ragilMap[p] ?? null })) }))
      .sort((a, b) => (a.method === "רגיל" ? -1 : b.method === "רגיל" ? 1 : 0) || (a.priority - b.priority) || (b.count - a.count));
  } catch { return []; }
}

// 🔢 תהודת האפס (zero_scale_law) — אותו שורש בסדר גודל אחר. סקאלות אחיות לערך.
export function zeroScales(n) {
  n = Number(n);
  const out = [];
  if (!n || n < 1) return out;
  if (n % 100 === 0 && n / 100 >= 10) out.push({ v: n / 100, label: "÷100" });
  if (n % 10 === 0 && n / 10 >= 10) out.push({ v: n / 10, label: "÷10" });
  out.push({ v: n * 10, label: "×10" });
  if (n * 100 <= 1000000) out.push({ v: n * 100, label: "×100" });
  return out;
}

// 🔢 תהודת האפס — הערך מהדהד בכל שכבות הגרף בסדרי גודל שונים (לא רק התאמת-ערך — משפחת-ערך).
// לכל סקאלה אחות מחזיר: מילים (רגיל) · גלריות · התכנסויות. מסנן סקאלות ריקות.
export async function getZeroResonance(value) {
  if (!supabase) return [];
  const scales = zeroScales(value);
  if (!scales.length) return [];
  const vals = scales.map(s => s.v);
  // מילים (רגיל) בכל הסקאלות — שאילתה אחת
  const wordsBy = {};
  try {
    const { data } = await supabase.from('bidim').select('value,phrase').eq('method', 'רגיל').in('value', vals).limit(5000);
    (data || []).forEach(r => {
      const g = (wordsBy[r.value] ||= { count: 0, seen: new Set(), sample: [] });
      if (!g.seen.has(r.phrase)) { g.seen.add(r.phrase); g.count++; if (g.sample.length < 8) g.sample.push(r.phrase); }
    });
  } catch { /* ignore */ }
  // התכנסויות מאושרות שמכילות אחת הסקאלות — שאילתה אחת
  const topicsBy = {};
  try {
    const { data } = await supabase.from('topic_cards').select('slug,title,numbers').eq('status', 'approved').overlaps('numbers', vals).limit(200);
    (data || []).forEach(t => (t.numbers || []).forEach(n => { if (vals.includes(n)) (topicsBy[n] ||= []).push({ slug: t.slug, title: t.title }); }));
  } catch { /* ignore */ }
  // גלריות — לכל סקאלה (תמונות שהערך מופיע בהן)
  const imgs = await Promise.all(scales.map(s => getImagesByValue(s.v).then(x => x || []).catch(() => [])));
  return scales.map((s, i) => ({
    v: s.v, label: s.label,
    words: { count: wordsBy[s.v]?.count || 0, sample: wordsBy[s.v]?.sample || [] },
    images: imgs[i],
    topics: topicsBy[s.v] || [],
  })).filter(r => r.words.count || r.images.length || r.topics.length);
}


// מחזיר [{value, size}] ממוין יורד לפי גודל המשפחה (כמה ביטויים שווים לאותו ערך).
export async function getPhraseValueFamilies(phrase) {
  if (!supabase || !phrase) return [];
  const { data: mine } = await supabase.from('bidim').select('value').eq('phrase', phrase);
  const vals = [...new Set((mine || []).map(r => r.value).filter(v => v >= 10))];
  if (!vals.length) return [];
  const { data: fam } = await supabase.from('bidim').select('value,phrase').in('value', vals).limit(8000);
  const byVal = {};
  (fam || []).forEach(r => { (byVal[r.value] ||= new Set()).add(r.phrase); });
  return vals.map(v => ({ value: v, size: byVal[v] ? byVal[v].size : 0 })).sort((a, b) => b.size - a.size);
}
// 🌳 מסע ההתכנסות — רשימת הביטויים ששווים לערך (משפחת-הערך = "בתוך המספר"). + world מ-nodes כשקיים.
export async function getValuePhraseList(value, limit = 120) {
  if (!supabase || !value) return [];
  const { data } = await supabase.from('bidim').select('phrase').eq('value', value).limit(limit * 2);
  const phrases = [...new Set((data || []).map(r => r.phrase).filter(Boolean))].slice(0, limit);
  if (!phrases.length) return [];
  const worldMap = {};
  for (let i = 0; i < phrases.length; i += 300) {
    const chunk = phrases.slice(i, i + 300);
    const { data: ents } = await supabase.from('nodes').select('label,metadata').eq('type', 'entity').in('label', chunk).limit(1000);
    (ents || []).forEach(n => { const w = n.metadata?.world; if (w && !worldMap[n.label]) worldMap[n.label] = w; });
  }
  return phrases.map(p => ({ phrase: p, world: worldMap[p] || null }));
}
// 🌳 מסע ההתכנסות — התחלה אקראית: ביטוי-זהב במשקל גבוה (כדי שיהיה אשכול-ערך עשיר).
export async function getRandomStartPhrase() {
  if (!supabase) return null;
  const { data } = await supabase.from('nodes').select('label').eq('type', 'entity').eq('is_active', true).gte('weight', 4).limit(400);
  const pool = [...new Set((data || []).map(r => r.label).filter(Boolean))];
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

// 🧬 משפחות לפי שיטה — לדף ביטוי: לכל שיטה הערך של הביטוי *באותה שיטה* + המילים השוות לו שם.
// pairs: [{method, value}] (הערך של הביטוי בכל שיטה). מחזיר [{method, value, count, phrases}].
export async function getMethodFamilies(pairs, selfTerm = null, perMethod = 20) {
  if (!supabase || !Array.isArray(pairs) || !pairs.length) return [];
  try {
    const valByMethod = {}; pairs.forEach(p => { if (p.value > 0) valByMethod[p.method] = p.value; });
    const values = [...new Set(Object.values(valByMethod))];
    if (!values.length) return [];
    const { data } = await supabase.from('bidim').select('method,phrase,value,priority').in('value', values).limit(4000);
    if (!data || !data.length) return [];
    // משאירים רק שורות שבהן הערך של השורה = הערך של הביטוי באותה שיטה
    const rows = data.filter(r => valByMethod[r.method] === r.value);
    if (!rows.length) return [];
    const phrases = [...new Set(rows.map(r => r.phrase))];
    const worldMap = {}, ragilMap = {};
    for (let i = 0; i < phrases.length; i += 300) {
      const chunk = phrases.slice(i, i + 300);
      const { data: ents } = await supabase.from('nodes').select('label,metadata')
        .eq('type', 'entity').in('label', chunk).limit(1000);
      (ents || []).forEach(n => { const w = n.metadata?.world; if (w && !worldMap[n.label]) worldMap[n.label] = w; });
      const { data: gw } = await supabase.from('gematria_words').select('phrase,ragil').in('phrase', chunk).limit(1000);
      (gw || []).forEach(r => { if (r.ragil != null && ragilMap[r.phrase] == null) ragilMap[r.phrase] = r.ragil; });
    }
    const groups = {};
    for (const r of rows) {
      const g = (groups[r.method] ||= { method: r.method, value: r.value, priority: r.priority ?? 9, seen: new Set(), phrases: [] });
      if (!g.seen.has(r.phrase)) {
        g.seen.add(r.phrase);
        if (r.phrase !== selfTerm) g.phrases.push({ phrase: r.phrase, world: worldMap[r.phrase] || null, ragil: ragilMap[r.phrase] ?? null });
      }
    }
    return Object.values(groups)
      .map(g => ({ method: g.method, value: g.value, priority: g.priority, count: g.phrases.length, phrases: g.phrases.slice(0, perMethod) }))
      .sort((a, b) => (a.method === "רגיל" ? -1 : b.method === "רגיל" ? 1 : 0) || (a.priority - b.priority) || (b.count - a.count));
  } catch { return []; }
}

// 🔥 מספר חם עכשיו — ה-term שנחקר הכי הרבה היום (הוכחה חברתית).
export async function getHotNumber() {
  try {
    const since = new Date(); since.setHours(0, 0, 0, 0);
    const { data } = await supabase.from('search_log')
      .select('term,value').gte('created_at', since.toISOString()).limit(800);
    const counts = {};
    for (const r of (data || [])) {
      const t = (r.term || '').trim(); if (!t) continue;
      (counts[t] = counts[t] || { n: 0, value: r.value }).n++;
    }
    let best = null;
    for (const [term, o] of Object.entries(counts)) if (!best || o.n > best.n) best = { term, value: o.value, n: o.n };
    return best && best.n >= 2 ? best : null;
  } catch { return null; }
}

// 💎 הצלבת קציר: פוסטים שמזכירים ביטוי ששווה למספר הזה (mentions שנקצרו מהפוסטים).
export async function getHarvestedPosts(value, lim = 6) {
  if (!supabase || !value) return [];
  try {
    const { data } = await supabase.rpc('posts_harvested_for_number', { num: value, lim });
    return data || [];
  } catch { return []; }
}

// ✦ topic_cards שמכילים מספר — לרצועת גילוי בדף המספר.
export async function getTopicCardsByNumber(value, limit = 6) {
  if (!supabase || !value) return [];
  try {
    const { data } = await supabase.from('topic_cards')
      .select('slug, title, subtitle, numbers, quality')
      .eq('status', 'approved')
      .contains('numbers', [value])
      .order('quality', { ascending: false })
      .limit(limit);
    return data || [];
  } catch { return []; }
}

// 🔗 מספרים-קרובים = גרף (נעילת צוריאל #3) — שכנים אמיתיים: מספרים שמופיעים יחד עם הערך
// באותה התכנסות (topic_cards) או באותה תמונה (gallery_images), ממוינים לפי משקל (RPC number_neighbors,
// עם דיכוי-IDF למספרי-הַאב). לא רשימת-סקאלה — קשרים בגרף. נכשל בשקט → [].
export async function getNumberNeighbors(value, limit = 8) {
  if (!supabase || !value) return [];
  try {
    const { data, error } = await supabase.rpc('number_neighbors', { p_value: Number(value), p_limit: limit });
    if (error) return [];
    return (data || []).map(r => ({
      value: r.value,
      weight: Number(r.weight),
      viaTopic: Number(r.via_topic) || 0,
      viaGallery: Number(r.via_gallery) || 0,
    }));
  } catch { return []; }
}

// 📌 שמירת סדר-המובילים (lead_rank) למספר — גרירה-ושחרור של מנהל. phrases = הסדר החדש (1-based).
// [] = איפוס לאוטומטי. מנהל בלבד (נבדק בשרת ב-admin_set_lead_ranks).
export async function setLeadRanks(value, phrases) {
  if (!supabase || !value) return { error: "no-supabase" };
  const { data, error } = await supabase.rpc("admin_set_lead_ranks", { p_value: Number(value), p_phrases: phrases || [] });
  if (error) return { error: error.message };
  return data || {};
}

// 🔍 autocomplete עברי — חיפוש prefix בטבלת bidim (שיטת רגיל).
export async function searchPhrases(prefix, limit = 8) {
  if (!supabase || !prefix || prefix.length < 2) return [];
  try {
    const { data } = await supabase.from('bidim')
      .select('phrase, value')
      .eq('method', 'רגיל')
      .ilike('phrase', `${prefix}%`)
      .order('value', { ascending: true })
      .limit(limit * 3);
    const seen = new Set(), out = [];
    for (const r of (data || [])) {
      if (!seen.has(r.phrase)) {
        seen.add(r.phrase);
        out.push(r);
        if (out.length >= limit) break;
      }
    }
    return out;
  } catch { return []; }
}

// ── hint_sets ──
export async function getHintSets({ status = null } = {}) {
  if (!supabase) return [];
  let q = supabase.from('hint_sets').select('*')
    .order('importance', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data } = await q;
  return data || [];
}

export async function getHintSet(id) {
  if (!supabase) return null;
  const { data: set } = await supabase.from('hint_sets').select('*').eq('id', id).single();
  const { data: members } = await supabase.from('hint_set_members').select('*').eq('set_id', id).order('sort_order');
  return { ...set, members: members || [] };
}

export async function saveHintSet(fields) {
  if (!supabase) throw new Error('no supabase');
  const { id, ...rest } = fields;
  rest.updated_at = new Date().toISOString();
  if (id) {
    const { data } = await supabase.from('hint_sets').update(rest).eq('id', id).select().single();
    return data;
  }
  const { data } = await supabase.from('hint_sets').insert(rest).select().single();
  return data;
}

export async function addHintSetMember(setId, memberType, memberId, sortOrder = 0, note = null) {
  if (!supabase) throw new Error('no supabase');
  const { data } = await supabase.from('hint_set_members')
    .insert({ set_id: setId, member_type: memberType, member_id: String(memberId), sort_order: sortOrder, note })
    .select().single();
  return data;
}

export async function removeHintSetMember(id) {
  if (!supabase) return;
  await supabase.from('hint_set_members').delete().eq('id', id);
}

export async function reorderHintSetMembers(setId, orderedMemberIds) {
  if (!supabase) return;
  await Promise.all(orderedMemberIds.map((id, i) =>
    supabase.from('hint_set_members').update({ sort_order: i }).eq('id', id).eq('set_id', setId)
  ));
}

// ── trails ──
export async function getTrails({ status = null } = {}) {
  if (!supabase) return [];
  let q = supabase.from('trails').select('*')
    .order('importance', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data } = await q;
  return data || [];
}

export async function saveTrail(fields) {
  if (!supabase) throw new Error('no supabase');
  const { id, ...rest } = fields;
  rest.updated_at = new Date().toISOString();
  if (id) {
    const { data } = await supabase.from('trails').update(rest).eq('id', id).select().single();
    return data;
  }
  const { data } = await supabase.from('trails').insert(rest).select().single();
  return data;
}

export async function addTrailMember(trailId, memberType, memberId, sortOrder = 0, note = null) {
  if (!supabase) throw new Error('no supabase');
  const { data } = await supabase.from('trail_members')
    .insert({ trail_id: trailId, member_type: memberType, member_id: String(memberId), sort_order: sortOrder, note })
    .select().single();
  return data;
}

export async function removeTrailMember(id) {
  if (!supabase) return;
  await supabase.from('trail_members').delete().eq('id', id);
}
