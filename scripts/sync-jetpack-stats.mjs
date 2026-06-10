#!/usr/bin/env node
// סנכרון היסטוריית גלישה מ-Jetpack / WordPress.com Stats אל טבלת legacy_traffic.
//
// מקור: https://stats.wordpress.com/csv.php  (api_key באורך 12 תווים הקס')
// מקורות הנתונים (עמודת source):
//   jetpack-total    → סך צפיות שנתי (period = שנה)
//   jetpack          → צפיות פר-פוסט מובילות לכל שנה (period = שנה)
//   jetpack-daily    → צפיות יומיות (period = YYYY-MM-DD) ← בסיס ליומי/שבועי/חודשי/שנתי
//   jetpack-referrer → מקורות תנועה (מאיפה נכנסים) all-time (period = 'all')
//   jetpack-click    → קליקים יוצאים all-time (period = 'all')
//   jetpack-search   → מילות חיפוש all-time (period = 'all')
//
// המפתח הוא סוד צד-שרת — אין להכניסו לקוד הלקוח / ל-bundle.
//
// הרצה:  SUPABASE_SERVICE_KEY=... node scripts/sync-jetpack-stats.mjs
// env (כולם עם ברירת מחדל פרט ל-SERVICE_KEY):
//   WP_STATS_KEY, BLOG_URI, SUPABASE_URL, SUPABASE_SERVICE_KEY, START_YEAR

import { createClient } from '@supabase/supabase-js';

const WP_STATS_KEY = process.env.WP_STATS_KEY || 'a98756ff1bd6';
const BLOG_URI     = process.env.BLOG_URI     || 'sod1820.co.il';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://linswmnnkjxvweumprav.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
const START_YEAR   = Number(process.env.START_YEAR || 2015);
const STATS_BASE   = 'https://stats.wordpress.com/csv.php';

if (!SERVICE_KEY) {
  console.error('❌ חסר SUPABASE_SERVICE_KEY (נדרשת הרשאת כתיבה ל-legacy_traffic תחת RLS)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const DAY = 86400000;
const dayStr = d => d.toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.floor((b - a) / DAY) + 1;

async function getStats(params) {
  const url = `${STATS_BASE}?${new URLSearchParams({
    api_key: WP_STATS_KEY, blog_uri: BLOG_URI, format: 'json', ...params,
  })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} (${params.table} ${params.end})`);
  const txt = await res.text();
  if (!txt.trim()) return [];
  try { return JSON.parse(txt); }
  catch { throw new Error(`JSON לא תקין (${params.table} ${params.end}): ${txt.slice(0, 120)}`); }
}

// צפיות יומיות — נמשך בחלונות של 90 יום (ה-API מגביל ~100 ימים לקריאה)
async function fetchDaily(today, floor) {
  const rows = [];
  const seen = new Set();
  let end = new Date(today);
  while (end >= floor) {
    const vv = await getStats({ table: 'views', end: dayStr(end), days: '90' });
    for (const d of (Array.isArray(vv) ? vv : [])) {
      if (!d.date || seen.has(d.date)) continue;
      if (new Date(`${d.date}T00:00:00Z`) < floor) continue;
      seen.add(d.date);
      rows.push({ post_id: null, title: d.date, url: null, views: d.views || 0, period: d.date, source: 'jetpack-daily' });
    }
    end = new Date(end.getTime() - 90 * DAY);
  }
  return rows;
}

// צבירה כוללת (summarize) עבור referrers / clicks / searchterms
async function fetchSummarized(table, key, source, limit) {
  const arr = await getStats({ table, end: dayStr(new Date()), days: '-1', summarize: '1', limit: String(limit) });
  return (Array.isArray(arr) ? arr : [])
    .filter(r => r && r[key])
    .map(r => ({
      post_id: null,
      title: String(r[key]),
      url: (table === 'referrers' || table === 'clicks') ? String(r[key]) : null,
      views: r.views || 0,
      period: 'all',
      source,
    }));
}

async function run() {
  const today = new Date();
  const thisYear = today.getFullYear();
  const floor = new Date(`${START_YEAR}-01-01T00:00:00Z`);
  const postRows = [];
  const totalRows = [];

  // צפיות יומיות תחילה — הבסיס המדויק (table=views עם days גדול מוגבל ל-~100 ימים,
  // לכן הסיכום השנתי מחושב מסכום הימים ולא מקריאה שנתית בודדת)
  console.log('📊 מושך צפיות יומיות (חלונות 90 יום)…');
  const dailyRows = await fetchDaily(today, floor);
  console.log(`   ✓ ${dailyRows.length} ימים`);

  const yearSum = new Map();
  for (const d of dailyRows) {
    const y = d.period.slice(0, 4);
    yearSum.set(y, (yearSum.get(y) || 0) + d.views);
  }

  // פר-שנה: פוסטים מובילים + סך שנתי (מהיומי)
  for (let year = START_YEAR; year <= thisYear; year++) {
    const start = new Date(`${year}-01-01T00:00:00Z`);
    const end   = year === thisYear ? today : new Date(`${year}-12-31T00:00:00Z`);
    const days  = daysBetween(start, end);

    const pv = await getStats({ table: 'postviews', end: dayStr(end), days: String(days), limit: '-1' });
    for (const p of (pv?.[0]?.postviews || [])) {
      if (!p.post_id || p.post_id === 0) continue;
      postRows.push({ post_id: p.post_id, title: p.post_title || '', url: p.permalink || null, views: p.views || 0, period: String(year), source: 'jetpack' });
    }

    const totalViews = yearSum.get(String(year)) || 0;
    totalRows.push({ post_id: null, title: `סך הכל ${year}`, url: null, views: totalViews, period: String(year), source: 'jetpack-total' });
    console.log(`📅 ${year}: ${(pv?.[0]?.postviews || []).length} פוסטים · ${totalViews.toLocaleString('he')} צפיות`);
  }

  console.log('🔗 מושך מקורות תנועה / קליקים / חיפושים…');
  const referrerRows = await fetchSummarized('referrers', 'referrer', 'jetpack-referrer', 80);
  const clickRows    = await fetchSummarized('clicks', 'click', 'jetpack-click', 60);
  const searchRows   = await fetchSummarized('searchterms', 'searchterm', 'jetpack-search', 60);
  console.log(`   ✓ ${referrerRows.length} מקורות · ${clickRows.length} קליקים · ${searchRows.length} חיפושים`);

  // אידמפוטנטיות — ניקוי לפני טעינה מחדש
  const { error: delErr } = await supabase.from('legacy_traffic').delete().like('source', 'jetpack%');
  if (delErr) { console.error('❌ מחיקה:', delErr.message); process.exit(1); }

  const all = [...totalRows, ...postRows, ...dailyRows, ...referrerRows, ...clickRows, ...searchRows];
  const CHUNK = 300;
  let done = 0;
  for (let i = 0; i < all.length; i += CHUNK) {
    const { error } = await supabase.from('legacy_traffic').insert(all.slice(i, i + CHUNK));
    if (error) { console.error('❌ הכנסה:', error.message); process.exit(1); }
    done += Math.min(CHUNK, all.length - i);
  }
  console.log(`\n✅ סנכרון הושלם — ${done} שורות`);
  console.log(`   ${totalRows.length} שנתי · ${postRows.length} פוסטים · ${dailyRows.length} יומי · ${referrerRows.length} מקורות · ${clickRows.length} קליקים · ${searchRows.length} חיפושים`);
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
