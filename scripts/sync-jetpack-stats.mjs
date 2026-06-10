#!/usr/bin/env node
// סנכרון היסטוריית גלישה מ-Jetpack / WordPress.com Stats אל טבלת legacy_traffic.
//
// מקור: https://stats.wordpress.com/csv.php  (api_key באורך 12 תווים הקס')
//   table=postviews → צפיות פר-פוסט לתקופה
//   table=views     → סך צפיות יומי (לחישוב סך שנתי)
//
// המפתח הוא סוד צד-שרת — אין להכניסו לקוד הלקוח / ל-bundle.
//
// הרצה:
//   SUPABASE_SERVICE_KEY=... node scripts/sync-jetpack-stats.mjs
// משתני סביבה (כולם עם ברירת מחדל פרט ל-SERVICE_KEY):
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

function daysBetween(a, b) {
  return Math.floor((b - a) / 86400000) + 1;
}

async function getStats(params) {
  const url = `${STATS_BASE}?${new URLSearchParams({
    api_key: WP_STATS_KEY, blog_uri: BLOG_URI, format: 'json', ...params,
  })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} (${params.table} ${params.end})`);
  const txt = await res.text();
  try { return JSON.parse(txt); }
  catch { throw new Error(`JSON לא תקין (${params.table} ${params.end}): ${txt.slice(0, 120)}`); }
}

async function run() {
  const today = new Date();
  const thisYear = today.getFullYear();
  const postRows = [];
  const totalRows = [];

  for (let year = START_YEAR; year <= thisYear; year++) {
    const start = new Date(`${year}-01-01T00:00:00Z`);
    const end   = year === thisYear ? today : new Date(`${year}-12-31T00:00:00Z`);
    const days  = daysBetween(start, end);
    const endStr = end.toISOString().slice(0, 10);

    // צפיות פר-פוסט (הפוסטים המובילים לאותה שנה)
    const pv = await getStats({ table: 'postviews', end: endStr, days: String(days), limit: '-1' });
    const list = pv?.[0]?.postviews || [];
    for (const p of list) {
      if (!p.post_id || p.post_id === 0) continue;
      postRows.push({
        post_id: p.post_id,
        title: p.post_title || '',
        url: p.permalink || null,
        views: p.views || 0,
        period: String(year),
        source: 'jetpack',
      });
    }

    // סך צפיות שנתי
    const vv = await getStats({ table: 'views', end: endStr, days: String(days) });
    const totalViews = (Array.isArray(vv) ? vv : []).reduce((s, d) => s + (d.views || 0), 0);
    totalRows.push({
      post_id: null,
      title: `סך הכל ${year}`,
      url: null,
      views: totalViews,
      period: String(year),
      source: 'jetpack-total',
    });

    console.log(`📅 ${year}: ${list.length} פוסטים מובילים · ${totalViews.toLocaleString('he')} צפיות`);
  }

  // אידמפוטנטיות — ניקוי לפני טעינה מחדש
  const { error: delErr } = await supabase
    .from('legacy_traffic').delete().like('source', 'jetpack%');
  if (delErr) { console.error('❌ מחיקה:', delErr.message); process.exit(1); }

  const all = [...totalRows, ...postRows];
  const CHUNK = 200;
  let done = 0;
  for (let i = 0; i < all.length; i += CHUNK) {
    const { error } = await supabase.from('legacy_traffic').insert(all.slice(i, i + CHUNK));
    if (error) { console.error('❌ הכנסה:', error.message); process.exit(1); }
    done += Math.min(CHUNK, all.length - i);
  }
  console.log(`\n✅ סנכרון הושלם — ${done} שורות (${totalRows.length} סיכומים שנתיים, ${postRows.length} פוסטים)`);
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
