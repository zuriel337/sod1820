// Vercel Serverless Function — sitemap.xml דינמי (מפת אתר חיה).
// בונה את מפת האתר ישירות מהגרף ב-Supabase בכל בקשה, כך שכל פוסט/מספר/התכנסות
// חדשים נכנסים לאינדקס אוטומטית — בלי להריץ סקריפט ובלי לדחוף קובץ.
// אותה לוגיקה בדיוק כמו scripts/gen-sitemap.mjs, רק חיה (live) במקום סטטית.
//   • עמודים סטטיים קנוניים (עמודי-על)
//   • כל הפוסטים → /<slug>
//   • דפי המספר → /number/:n  (כל מספר ≥10 שיש לו תמונות בגלריה, primary_value)
//   • צירי ההתכנסות המאושרים → /topic/:slug

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

const SITE = 'https://sod1820.co.il';
const HEADERS = { apikey: ANON, Authorization: 'Bearer ' + ANON };

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function urlTag({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${esc(SITE + loc)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority ? `    <priority>${priority}</priority>` : '',
    '  </url>',
  ].filter(Boolean).join('\n');
}

// עמודי-על קנוניים (מקבילים ל-scripts/gen-sitemap.mjs)
const STATIC = [
  { loc: '/',             priority: '1.0', changefreq: 'daily'   },
  { loc: '/start',        priority: '0.8', changefreq: 'monthly' },
  { loc: '/map',          priority: '0.6', changefreq: 'monthly' },
  { loc: '/timeline',     priority: '0.8', changefreq: 'weekly'  },
  { loc: '/numbers',      priority: '0.6', changefreq: 'monthly' },
  { loc: '/gematria',     priority: '0.8', changefreq: 'monthly' },
  { loc: '/name',         priority: '0.6', changefreq: 'monthly' },
  { loc: '/journey',      priority: '0.5', changefreq: 'monthly' },
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

// משיכה בעימוד דרך REST (limit/offset), עד שהדף האחרון קצר מ-PAGE.
async function fetchAll(path) {
  const PAGE = 1000;
  const out = [];
  for (let from = 0; from < 100000; from += PAGE) {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${SUPABASE_URL}/rest/v1/${path}${sep}limit=${PAGE}&offset=${from}`;
    const r = await fetch(url, { headers: HEADERS });
    if (!r.ok) break;
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export default async function handler(req, res) {
  const urls = [...STATIC];

  // ── פוסטים → /<slug> ──
  try {
    const posts = await fetchAll('posts?select=slug,modified,date&order=date.desc');
    for (const p of posts) {
      if (!p.slug) continue;
      const lastmod = (p.modified || p.date || '').slice(0, 10) || undefined;
      // סלאגים מוורדפרס כבר מקודדי-URL (%d7%aa...). encodeURI היה מקודד שוב את ה-%
      // ל-%25 → קידוד-כפול שגוי שלא תואם ל-canonical. לכן מקודדים רק עברית "נקייה".
      const encodedSlug = p.slug.includes('%') ? p.slug : encodeURI(p.slug);
      urls.push({ loc: '/' + encodedSlug, lastmod, changefreq: 'monthly', priority: '0.7' });
    }
  } catch (e) { /* ממשיכים גם בלי פוסטים */ }

  // ── דפי מספר → /number/:n — יהלומים: גלריות ∪ גימטריה עשירה(≥20) ∪ התכנסויות (RPC sitemap_numbers).
  // כולל lastmod (אות re-crawl לתבנית ה-story-top) + priority לפי עושר. ספרה בודדת מפנה ל-/sulamot → ≥10.
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sitemap_numbers`, {
      method: 'POST', headers: { ...HEADERS, 'Content-Type': 'application/json' }, body: '{}',
    });
    if (r.ok) {
      const rows = await r.json();
      for (const row of (Array.isArray(rows) ? rows : [])) {
        const n = Number(row.value);
        if (Number.isFinite(n) && n >= 10)
          urls.push({ loc: '/number/' + n, lastmod: row.lastmod || undefined, changefreq: 'monthly', priority: row.priority || '0.6' });
      }
    }
  } catch (e) { /* ממשיכים גם בלי דפי מספר */ }

  // ── צירי התכנסות מאושרים → /topic/:slug ──
  try {
    const topics = await fetchAll('topic_cards?select=slug,approved_at,created_at&status=eq.approved');
    for (const t of topics) {
      if (!t.slug) continue;
      const lastmod = (t.approved_at || t.created_at || '').slice(0, 10) || undefined;
      urls.push({ loc: '/topic/' + encodeURIComponent(t.slug), lastmod, changefreq: 'weekly', priority: '0.7' });
    }
  } catch (e) { /* ממשיכים גם בלי התכנסויות */ }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls.map(urlTag).join('\n'),
    '</urlset>',
    '',
  ].join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  // נשמר בקאש שעה בדפדפן / 6 שעות ב-CDN — טרי מספיק, וזול על המכסה.
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
