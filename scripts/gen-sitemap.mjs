// יצירת public/sitemap.xml מתוך פוסטים ב-Supabase + נתיבים סטטיים.
// הרצה: node scripts/gen-sitemap.mjs
// משתמש במפתח ה-anon הציבורי (קריאה בלבד), כך שאין צורך בסודות.

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SITE_URL = 'https://sod1820.co.il';
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'sitemap.xml');

const supabase = createClient(
  'https://linswmnnkjxvweumprav.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM'
);

const STATIC = [
  { loc: '/',             priority: '1.0', changefreq: 'daily'   },
  { loc: '/start',        priority: '0.8', changefreq: 'monthly' },
  { loc: '/map',          priority: '0.6', changefreq: 'monthly' },
  { loc: '/timeline',     priority: '0.8', changefreq: 'weekly'  },
  { loc: '/numbers',      priority: '0.6', changefreq: 'monthly' },
  { loc: '/beit-midrash', priority: '0.8', changefreq: 'weekly'  },
  { loc: '/code',         priority: '0.6', changefreq: 'monthly' },
  { loc: '/post',         priority: '0.9', changefreq: 'daily'   },
  { loc: '/archive',      priority: '0.8', changefreq: 'weekly'  },
  { loc: '/verified',     priority: '0.7', changefreq: 'weekly'  },
  { loc: '/sulamot',      priority: '0.5', changefreq: 'monthly' },
  { loc: '/community',    priority: '0.5', changefreq: 'weekly'  },
  { loc: '/community/calculator', priority: '0.8', changefreq: 'monthly' },
  { loc: '/cross',        priority: '0.7', changefreq: 'monthly' },
  { loc: '/contact',      priority: '0.4', changefreq: 'yearly'  },
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function urlTag({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${esc(SITE_URL + loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority ? `    <priority>${priority}</priority>` : '',
    '  </url>',
  ].filter(Boolean).join('\n');
}

async function main() {
  const urls = [...STATIC];

  // משיכת כל הפוסטים (slug + תאריך עדכון) בעימוד
  let from = 0;
  const PAGE = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from('posts')
      .select('slug, modified, date')
      .order('date', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) { console.error('Supabase error:', error.message); break; }
    if (!data?.length) break;
    for (const p of data) {
      if (!p.slug) continue;
      const lastmod = (p.modified || p.date || '').slice(0, 10) || undefined;
      // סלאגים מוורדפרס כבר מקודדי-URL (%d7%aa...). encodeURI היה מקודד שוב את ה-% ל-%25
      // וגורם לקידוד-כפול שגוי שלא תואם ל-canonical. לכן מקודדים רק סלאגים בעברית "נקייה".
      const encodedSlug = p.slug.includes('%') ? p.slug : encodeURI(p.slug);
      urls.push({ loc: '/' + encodedSlug, lastmod, changefreq: 'monthly', priority: '0.7' });
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

  // דפי המספרים (/number/<מספר>) — כל מספר שיש לו תמונות בגלריה (primary_value)
  const numbers = new Set();
  from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('gallery_images')
      .select('primary_value')
      .not('primary_value', 'is', null)
      .range(from, from + PAGE - 1);
    if (error) { console.error('Supabase error (numbers):', error.message); break; }
    if (!data?.length) break;
    for (const r of data) {
      const n = Number(r.primary_value);
      // דף הישות דורש מינימום 2 ספרות (ספרה בודדת מפנה ל-/sulamot)
      if (Number.isFinite(n) && n >= 10) numbers.add(n);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  for (const n of [...numbers].sort((a, b) => a - b)) {
    urls.push({ loc: '/number/' + n, changefreq: 'monthly', priority: '0.6' });
  }

  // צירי התכנסות (/topic/<slug>) — רק כרטיסים מאושרים
  try {
    const { data, error } = await supabase
      .from('topic_cards')
      .select('slug, approved_at, created_at')
      .eq('status', 'approved');
    if (error) { console.error('Supabase error (topics):', error.message); }
    else for (const t of data || []) {
      if (!t.slug) continue;
      const lastmod = (t.approved_at || t.created_at || '').slice(0, 10) || undefined;
      urls.push({ loc: '/topic/' + encodeURIComponent(t.slug), lastmod, changefreq: 'weekly', priority: '0.7' });
    }
  } catch (e) { console.error('topics sitemap skipped:', e.message); }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls.map(urlTag).join('\n'),
    '</urlset>',
    '',
  ].join('\n');

  writeFileSync(OUT, xml, 'utf8');
  console.log(`Wrote ${urls.length} URLs → ${OUT}`);
}

main();
