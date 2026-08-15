// Vercel Serverless Function — sitemap.xml דינמי (מפת אתר חיה).
// בונה את מפת האתר ישירות מהגרף ב-Supabase בכל בקשה, כך שכל פוסט/מספר/התכנסות
// חדשים נכנסים לאינדקס אוטומטית — בלי להריץ סקריפט ובלי לדחוף קובץ.
// אותה לוגיקה בדיוק כמו scripts/gen-sitemap.mjs, רק חיה (live) במקום סטטית.
//   • עמודים סטטיים קנוניים (עמודי-על)
//   • כל הפוסטים → /<slug>
//   • דפי המספר → /number/:n  (כל מספר ≥10 שיש לו תמונות בגלריה, primary_value)
//   • צירי ההתכנסות המאושרים → /topic/:slug
//   • דפי הכתבים → /community/researcher/:slug  (contributors עם slug/code)

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

// 🎬 Video Sitemap (video:video) — כל סרטון של אור-הגאולה = תוצאת-וידאו בגוגל.
const VIDEO_RE = /\.(mp4|mov|webm|m4v|avi|mkv)($|\?|#)/i;
const cleanCap = t => { const s = String(t || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); return (s && s !== '📷 עדכון' && s !== '🎬 עדכון וידאו') ? s : ''; };
// כרטיס ממותד כרשת-ביטחון ל-thumbnail — רק כשעדיין אין פריים אמיתי (הלכידה מהצד-לקוח תחליף אותו).
// כך כל סרטון נכנס למפת-הסרטונים מיד, בלי להמתין ללכידה. thumbnail_loc חובה ב-video:video.
const cardThumb = v => `${SITE}/api/card?w=${encodeURIComponent(cleanCap(v.text).slice(0, 60) || 'אור הגאולה')}&sub=${encodeURIComponent('אור הגאולה · סרטון')}&sig=orgeula`;
function videoUrlTag(v) {
  const title = cleanCap(v.text).slice(0, 100) || 'אור הגאולה — סרטון';
  const desc = cleanCap(v.text).slice(0, 2048) || title;
  const thumb = v.thumb_url || cardThumb(v);
  let pub; try { pub = v.created_at ? new Date(v.created_at).toISOString() : undefined; } catch { pub = undefined; }
  return [
    '  <url>',
    `    <loc>${esc(SITE + '/or-geula?v=' + v.id)}</loc>`,
    '    <video:video>',
    `      <video:thumbnail_loc>${esc(thumb)}</video:thumbnail_loc>`,
    `      <video:title>${esc(title)}</video:title>`,
    `      <video:description>${esc(desc)}</video:description>`,
    `      <video:content_loc>${esc(v.image_url)}</video:content_loc>`,
    pub ? `      <video:publication_date>${pub}</video:publication_date>` : '',
    '    </video:video>',
    '  </url>',
  ].filter(Boolean).join('\n');
}

// עמודי-על קנוניים (מקבילים ל-scripts/gen-sitemap.mjs)
const STATIC = [
  { loc: '/',             priority: '1.0', changefreq: 'daily'   },
  { loc: '/start',        priority: '0.8', changefreq: 'monthly' },
  { loc: '/map',          priority: '0.6', changefreq: 'monthly' },
  { loc: '/broadcasts',   priority: '0.6', changefreq: 'daily'   },
  { loc: '/forum',        priority: '0.7', changefreq: 'daily'   },
  { loc: '/or-geula',     priority: '0.7', changefreq: 'weekly'  },
  { loc: '/timeline',     priority: '0.8', changefreq: 'weekly'  },
  { loc: '/numbers',      priority: '0.6', changefreq: 'monthly' },
  { loc: '/gematria',     priority: '0.8', changefreq: 'monthly' },
  { loc: '/name',         priority: '0.6', changefreq: 'monthly' },
  { loc: '/journey',      priority: '0.5', changefreq: 'monthly' },
  { loc: '/beit-midrash', priority: '0.8', changefreq: 'weekly'  },
  { loc: '/code',         priority: '0.6', changefreq: 'monthly' },
  { loc: '/codes',        priority: '0.7', changefreq: 'weekly'  },
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

  // ── פתילי פורום מאושרים → /forum/:id (research_contributions ברמה-עליונה) ──
  // כל פתיל = עמוד DiscussionForumPosting עצמאי; בלי זה גוגל בקושי מגלה דיונים בודדים.
  try {
    const threads = await fetchAll('research_contributions?select=id,created_at&status=eq.approved&parent_id=is.null&order=created_at.desc');
    for (const t of threads) {
      if (!t.id) continue;
      const lastmod = (t.created_at || '').slice(0, 10) || undefined;
      urls.push({ loc: '/forum/' + encodeURIComponent(t.id), lastmod, changefreq: 'weekly', priority: '0.6' });
    }
  } catch (e) { /* ממשיכים גם בלי פתילי פורום */ }

  // ── צפנים מאושרים → /codes/:slug (els_records published) ──
  try {
    const codes = await fetchAll('els_records?select=slug,created_at&status=eq.published');
    for (const c of codes) {
      if (!c.slug) continue;
      const lastmod = (c.created_at || '').slice(0, 10) || undefined;
      urls.push({ loc: '/codes/' + encodeURIComponent(c.slug), lastmod, changefreq: 'monthly', priority: '0.7' });
    }
  } catch (e) { /* ממשיכים גם בלי צפנים */ }

  // ── דפי הכתבים → /community/researcher/:slug (contributors עם slug/code) ──
  // המשטח הציבורי/SEO של כל חוקר — קיר-ההצלבות, האוצרות והרמזים שלו. אותו slug שה-OG מזהה (code||slug).
  try {
    const cons = await fetchAll('contributors?select=slug,code');
    const seen = new Set();
    for (const c of cons) {
      const slug = c.code || c.slug;
      // דילוג על פרופילים אוטומטיים (r-<hash>) — לא דפי-כתב אצורים, לא לאינדקס
      if (!slug || seen.has(slug) || /^r-[0-9a-f]{16,}$/i.test(slug)) continue;
      seen.add(slug);
      urls.push({ loc: '/community/researcher/' + encodeURIComponent(slug), changefreq: 'weekly', priority: '0.6' });
    }
  } catch (e) { /* ממשיכים גם בלי דפי-כתבים */ }

  // ── סרטוני אור-הגאולה → Video Sitemap (video:video) ──
  let videoUrls = [];
  try {
    const rows = await fetchAll('channel_updates?select=id,text,image_url,thumb_url,created_at&channel=eq.or-geula&image_url=not.is.null&order=created_at.desc');
    // כל סרטון נכנס — thumbnail אמיתי אם יש, אחרת כרטיס-ממותד זמני (videoUrlTag דואג לנפילה).
    videoUrls = rows.filter(r => r.image_url && VIDEO_RE.test(r.image_url));
  } catch (e) { /* ממשיכים גם בלי סרטונים */ }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">',
    urls.map(urlTag).join('\n'),
    videoUrls.map(videoUrlTag).join('\n'),
    '</urlset>',
    '',
  ].filter(Boolean).join('\n');

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  // נשמר בקאש שעה בדפדפן / 6 שעות ב-CDN — טרי מספיק, וזול על המכסה.
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
