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
  const { data } = await supabase
    .from('gematria_words')
    .select('phrase, ragil, created_at')
    .eq('is_verified', true)
    .not('created_at', 'is', null)
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  return data ?? [];
}

// ===== ארכיון הגלריות ("גלריית רמזי הגאולה") =====
// סקירה: רשימת גלריות + תמונות קלות (לכריכה+ספירה).
export async function getGalleriesOverview() {
  if (!supabase) return { gals: [], imgs: [] };
  const { data: gals } = await supabase
    .from('galleries')
    .select('id,name,anchor_number,img_count,wp_gallery_id');
  let imgs = [], from = 0;
  while (true) {
    const { data } = await supabase
      .from('gallery_images')
      .select('id,gallery_id,image_url,name,description,ordering,primary_value,all_values,occurred_at,created_at,importance,image_type,source,curator_hidden,tags')
      .not('image_url', 'is', null)
      .order('occurred_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(from, from + 999);
    if (!data || !data.length) break;
    imgs = imgs.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return { gals: gals || [], imgs };
}

// המספרים החזקים בכל המאגר (אגרגציה) — לבועות-העל בדף הבית. [{value,count}].
export async function getTopPrimaryValues(lim = 16) {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('top_primary_values', { lim });
  if (error || !data) return [];
  return data.map(r => ({ value: Number(r.value), count: Number(r.cnt) }));
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
    .select('id,image_url,name,description,primary_value,all_values,occurred_at,created_at,importance')
    .eq('source', 'update')
    .not('image_url', 'is', null)
    .not('curator_hidden', 'is', true)
    .eq('min_tier', 0)                                               // נראות: ציבורי בלבד (פרימיום/מוסתר נחסם)
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
    .select('id,image_url,name,description,primary_value,all_values,occurred_at,created_at,importance,ocr_meta,image_type')
    .eq('source', 'update')
    .not('image_url', 'is', null)
    .not('curator_hidden', 'is', true)
    .eq('min_tier', 0)                                               // נראות: ציבורי בלבד
    .order('importance', { ascending: false, nullsFirst: false })
    .order('occurred_at', { ascending: false, nullsFirst: false })
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
    .select('id,image_url,name,description,primary_value,all_values,occurred_at,created_at,importance,image_type,tags')
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
    .select('id,name,description,image_url,ordering,primary_value,all_values,occurred_at')
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
    .select('id,name,description,image_url,primary_value,all_values,occurred_at,created_at,importance')
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
    .select('id,name,description,image_url,primary_value,all_values,occurred_at,created_at,importance')
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
    .select('id,name,description,image_url,ordering,primary_value,all_values,occurred_at,created_at,importance')
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
      ? supabase.from('gematria_words').select('phrase,ragil', { count: 'exact' })
          .eq('ragil', value).order('is_verified', { ascending: false }).limit(500)
          .then(({ data, count }) => ({ items: data || [], count: count ?? (data?.length || 0) }))
          .catch(() => ({ items: [], count: 0 }))
      : Promise.resolve({ items: [], count: 0 }),
    postsP,
    // גלריות: למספר — שתי שאילתות מדורגות כדי שתמונות *על* המספר (primary_value)
    // יגיעו תמיד תחילה, ואז אזכורים (all_values). סינון-הרלוונטיות נעשה בדף עצמו.
    isNumber ? (async () => {
      try {
        const cols = 'id,name,description,image_url,primary_value,gallery_id,all_values,occurred_at,created_at,importance';
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
    sec('gallery_images', 'id,name,description,image_url,primary_value,gallery_id,all_values,occurred_at,created_at,importance',
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
  return { searches, words, total, topNumber };
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
  try { await supabase.from('user_activity').insert({ kind, ref, title: title ? String(title).slice(0, 200) : null }); }
  catch { /* silent */ }
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
  const { data, error } = await supabase.from('gallery_images')
    .update(patch).eq('id', id).select('id,importance,curator_hidden,source').maybeSingle();
  if (error) throw error;
  return data;
}
// השורה המלאה של תמונה לפי id — "עץ אחד": העורך מושך את כל השדות (תגיות/מספרים/הגדרות)
// גם אם נפתח ממקור שמביא רק חלק מהשדות (קרוסלה/עדכונים/חיפוש).
export async function getGalleryImageFull(id) {
  if (!supabase || !id) return null;
  try {
    const { data } = await supabase.from('gallery_images')
      .select('id,image_url,name,description,primary_value,all_values,occurred_at,created_at,importance,image_type,source,curator_hidden,tags,ocr_status,ocr_numbers')
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
export async function getGalleryPage({ type = null, page = 0, limit = 60, search = "" } = {}) {
  if (!supabase) return { data: [], count: 0 };
  let q = supabase.from('gallery_images')
    .select('id,name,description,image_url,primary_value,all_values,occurred_at,image_type,source,importance,curator_hidden', { count: 'exact' })
    .not('image_url', 'is', null)
    .not('curator_hidden', 'is', true);
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
      .select('slug, title, numbers, quality')
      .eq('status', 'approved')
      .contains('numbers', [value])
      .order('quality', { ascending: false })
      .limit(limit);
    return data || [];
  } catch { return []; }
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
