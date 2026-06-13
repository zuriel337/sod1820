// יצירת public/sitemap.xml מתוך פוסטים ב-Supabase + נתיבים סטטיים.
// הרצה: node scripts/gen-sitemap.mjs
// משתמש במפתח ה-anon הציבורי (קריאה בלבד), כך שאין צורך בסודות.

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SITE_URL = 'https://sod1820.com';
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'sitemap.xml');

const supabase = createClient(
  'https://linswmnnkjxvweumprav.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM'
);

const STATIC = [
  { loc: '/',     priority: '1.0', changefreq: 'daily'  },
  { loc: '/post', priority: '0.9', changefreq: 'daily'  },
  { loc: '/chat', priority: '0.5', changefreq: 'weekly' },
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
      urls.push({ loc: '/' + encodeURI(p.slug), lastmod, changefreq: 'monthly', priority: '0.7' });
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }

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
