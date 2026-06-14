// Vercel Serverless Function — הזרקת תגיות Open Graph לכל עמוד עבור רובוטי הרשתות.
// רובוטים של פייסבוק/וואטסאפ/טלגרם לא מריצים JS, ולכן הם מנותבים לכאן (לפי User-Agent
// ב-vercel.json) ומקבלים HTML עם הכותרת/התיאור/התמונה הנכונים של אותו פוסט. משתמשים
// רגילים (וגוגל, שמריץ JS) ממשיכים לקבל את ה-SPA כרגיל.

const SUPABASE_URL = 'https://linswmnnkjxvweumprav.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbnN3bW5ua2p4dndldW1wcmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2Mjg3NjIsImV4cCI6MjA5NjIwNDc2Mn0.R6Zz1PCdGdCDnZ0Ltza4OMFOc146zCIOQrBtTWpujiM';

const SITE = 'https://sod1820.co.il';
const SITE_NAME = 'SOD1820';
const DEFAULT_DESC = "אתר כי לה' המלוכה – רמזי הגאולה הגדול בעולם. 13 שנות מחקר, תוכנת דילוגי אותיות, מחשבון גימטריה, עץ המספרים, מאגר חי של צפנים, חידושי AI וכלים לקריאת המציאות בשפת המספרים.";
const DEFAULT_IMAGE = SITE + '/logo.png';

// עמודים סטטיים — כותרת/תיאור תואמים ל-ROUTE_META (כפי ש-applySeo מרכיב)
const STATIC = {
  '/': { title: "כי לה' המלוכה – SOD1820 | רמזי הגאולה, דילוגי אותיות ומחשבון גימטריה", desc: DEFAULT_DESC },
  '/community/calculator': { title: "מחשבון גימטריה חינם — גלו את הסוד שבשם שלכם · " + SITE_NAME, desc: "רוצים לדעת מה מסתתר בשם שלכם? מחשבון הגימטריה החינמי והמדויק של SOD1820 — חישוב כל שם או מילה ב-8 שיטות, השוואה בין שני שמות וגילוי הקשרים הנסתרים בשפת המספרים." },
  '/code': { title: "חיפוש בצופן התנ\"כי עם AI — דילוגי אותיות בתורה ובתנ\"ך · " + SITE_NAME, desc: "חיפוש בצופן התנ\"כי בעזרת בינה מלאכותית — דילוגי אותיות (ELS), חישוב בתורה וחיפוש תבניות נסתרות בתנ\"ך." },
  '/post': { title: "פוסטים אחרונים · " + SITE_NAME, desc: "כל הפוסטים והתיעודים באתר SOD1820 — חיפוש, גימטריה וסינון." },
  '/beit-midrash': { title: "בית המדרש · " + SITE_NAME, desc: "לימוד שיטות הגימטריה — מסתתר, קדמי, מילוי, אלב\"ם, אתב\"ש ועוד." },
};

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripHtml = (s = '') => String(s).replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

export default async function handler(req, res) {
  let path = String((req.query && req.query.path) || '/').split('?')[0];
  if (!path.startsWith('/')) path = '/' + path;

  let title = STATIC['/'].title;
  let desc = DEFAULT_DESC;
  let image = DEFAULT_IMAGE;
  let type = 'website';
  const canonical = SITE + (path === '/' ? '' : path);

  const key = path.replace(/\/$/, '') || '/';
  if (STATIC[key]) {
    title = STATIC[key].title;
    desc = STATIC[key].desc;
  } else {
    // לטפל כ-slug של פוסט
    let slug = key.replace(/^\//, '');
    try { slug = decodeURIComponent(slug); } catch { /* keep */ }
    try {
      const url = `${SUPABASE_URL}/rest/v1/posts?slug=eq.${encodeURIComponent(slug)}&select=title,excerpt,content,image_url&limit=1`;
      const r = await fetch(url, { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON } });
      const rows = await r.json();
      if (Array.isArray(rows) && rows[0]) {
        const p = rows[0];
        title = stripHtml(p.title) + ' · ' + SITE_NAME;
        desc = (stripHtml(p.excerpt) || stripHtml(p.content)).slice(0, 200) || DEFAULT_DESC;
        if (p.image_url) image = p.image_url;
        type = 'article';
      }
    } catch { /* fall back to defaults */ }
  }

  const html = `<!doctype html>
<html lang="he" dir="rtl"><head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="${esc(canonical)}"/>
<meta property="og:site_name" content="${SITE_NAME}"/>
<meta property="og:locale" content="he_IL"/>
<meta property="og:type" content="${type}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:url" content="${esc(canonical)}"/>
<meta property="og:image" content="${esc(image)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${esc(image)}"/>
<meta http-equiv="refresh" content="0; url=${esc(canonical)}"/>
</head><body>
<h1>${esc(title)}</h1>
<p>${esc(desc)}</p>
<p><a href="${esc(canonical)}">המשך לעמוד ←</a></p>
</body></html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=600');
  res.status(200).send(html);
}
