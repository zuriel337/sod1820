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

// תיאור מטא נקי, קצוץ לגבול מילה (~160 תווים) — ללא חיתוך באמצע מילה.
function cleanDesc(raw = '', max = 160) {
  let s = stripHtml(raw).replace(/^\s*מאת[:\s].{0,40}?(?=\s)/, ' ').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  s = s.slice(0, max);
  const cut = s.lastIndexOf(' ');
  if (cut > max * 0.6) s = s.slice(0, cut);
  return s.replace(/[\s,.;:–-]+$/, '') + '…';
}

export default async function handler(req, res) {
  let path = String((req.query && req.query.path) || '/').split('?')[0];
  if (!path.startsWith('/')) path = '/' + path;

  let title = STATIC['/'].title;
  let desc = DEFAULT_DESC;
  let image = DEFAULT_IMAGE;
  let type = 'website';
  let post = null;  // נתוני הפוסט (לתגיות article ו-JSON-LD)
  const canonical = SITE + (path === '/' ? '' : path);

  const key = path.replace(/\/$/, '') || '/';
  const ogHeaders = { apikey: ANON, Authorization: 'Bearer ' + ANON };
  if (STATIC[key]) {
    title = STATIC[key].title;
    desc = STATIC[key].desc;
  } else if (key.startsWith('/topic/')) {
    // ציר התכנסות — כותרת/תת + תמונה ראשונה מהגלריה
    let slug = key.slice('/topic/'.length);
    try { slug = decodeURIComponent(slug); } catch { /* keep */ }
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/topic_cards?slug=eq.${encodeURIComponent(slug)}&select=title,subtitle,image_ids,highlight_numbers&limit=1`, { headers: ogHeaders });
      const rows = await r.json();
      const c = Array.isArray(rows) && rows[0];
      if (c) {
        title = stripHtml(c.title) + ' · ' + SITE_NAME;
        desc = cleanDesc(c.subtitle || `מרכז ההתכנסות של ${stripHtml(c.title)}${(c.highlight_numbers || []).length ? ' — ' + c.highlight_numbers.join(' · ') : ''}`) || DEFAULT_DESC;
        type = 'article';
        // תמונת שיתוף דינמית: כותרת ההתכנסות גדולה + המספרים. נופלת חזרה לתמונת גלריה.
        const nums = Array.isArray(c.highlight_numbers) ? c.highlight_numbers.filter(x => x != null) : [];
        const ct = stripHtml(c.title);
        image = `${SITE}/api/card?w=${encodeURIComponent(ct)}&sub=${encodeURIComponent(nums.length ? nums.join('  ·  ') : 'מרכז ההתכנסות')}`;
      }
    } catch { /* fallback to defaults */ }
  } else if (key.startsWith('/number/')) {
    // עמוד מספר — תמונה מייצגת (primary_value)
    let raw = key.slice('/number/'.length);
    try { raw = decodeURIComponent(raw); } catch { /* keep */ }
    const n = parseInt(raw, 10);
    if (Number.isFinite(n)) {
      title = `${n} — מרכז ההתכנסות · ${SITE_NAME}`;
      desc = `כל מה שמתכנס למספר ${n} בסוד 1820 — גימטריה, גלריות, פוסטים וצירי התכנסות במקום אחד.`;
      type = 'article';
      // תמונת שיתוף דינמית: המספר ענק + הביטויים השווים לו + כיתוב ויראלי.
      image = `${SITE}/api/card?n=${n}`;
    }
  } else {
    // לטפל כ-slug של פוסט.
    // חלק מהפוסטים שמורים עם slug בעברית (תפילה-לרפואה…) וחלק עם slug מקודד-אחוזים
    // בסגנון וורדפרס (%d7%aa…). הרובוט מגיע עם הנתיב המפוענח, לכן מנסים את שתי הצורות:
    // (1) ה-slug המפוענח, (2) קידוד-אחוזים באותיות קטנות (כמו שוורדפרס שמר).
    let slug = key.replace(/^\//, '');
    try { slug = decodeURIComponent(slug); } catch { /* keep */ }
    const variants = [slug];
    const encLower = encodeURIComponent(slug).replace(/%[0-9A-Fa-f]{2}/g, m => m.toLowerCase());
    if (encLower !== slug) variants.push(encLower);
    const SEL = 'select=title,excerpt,content,image_url,date,modified,tags,categories,author&limit=1';
    for (const v of variants) {
      try {
        const url = `${SUPABASE_URL}/rest/v1/posts?slug=eq.${encodeURIComponent(v)}&${SEL}`;
        const r = await fetch(url, { headers: { apikey: ANON, Authorization: 'Bearer ' + ANON } });
        const rows = await r.json();
        if (Array.isArray(rows) && rows[0]) {
          post = rows[0];
          title = stripHtml(post.title) + ' · ' + SITE_NAME;
          desc = cleanDesc(post.excerpt || post.content) || DEFAULT_DESC;
          if (post.image_url) image = post.image_url;
          type = 'article';
          break;
        }
      } catch { /* try next variant */ }
    }
  }

  // ── מטא ייעודי למאמרים + JSON-LD ──
  let articleMeta = '';
  let jsonLd = '';
  if (type === 'article' && post) {
    const author = stripHtml(post.author || '') || SITE_NAME;
    const section = Array.isArray(post.categories) && post.categories[0] ? esc(post.categories[0]) : '';
    const tagMeta = (Array.isArray(post.tags) ? post.tags : []).slice(0, 8)
      .map(t => `<meta property="article:tag" content="${esc(t)}"/>`).join('');
    articleMeta =
      (post.date ? `<meta property="article:published_time" content="${esc(post.date)}"/>` : '') +
      (post.modified || post.date ? `<meta property="article:modified_time" content="${esc(post.modified || post.date)}"/>` : '') +
      `<meta property="article:author" content="${esc(author)}"/>` +
      (section ? `<meta property="article:section" content="${section}"/>` : '') +
      tagMeta +
      `<meta property="og:image:alt" content="${esc(stripHtml(post.title))}"/>`;
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: stripHtml(post.title).slice(0, 110),
      description: desc,
      image: [image],
      author: { '@type': author === SITE_NAME ? 'Organization' : 'Person', name: author },
      publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: SITE + '/logo.png' } },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
      inLanguage: 'he-IL',
    };
    if (post.date) ld.datePublished = post.date;
    ld.dateModified = post.modified || post.date || undefined;
    jsonLd = `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
  }

  const html = `<!doctype html>
<html lang="he" dir="rtl"><head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<meta name="robots" content="index, follow"/>
<link rel="canonical" href="${esc(canonical)}"/>
<meta property="og:site_name" content="${SITE_NAME}"/>
<meta property="og:locale" content="he_IL"/>
<meta property="og:type" content="${type}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:url" content="${esc(canonical)}"/>
<meta property="og:image" content="${esc(image)}"/>
${articleMeta}
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${esc(image)}"/>
${jsonLd}
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
