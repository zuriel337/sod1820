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

// בונה כתובת לתמונת שיתוף דינמית (כרטיס 1200×630) — w=גיבור · sub=שורת משנה · cap=טיזר · sig=חתימה
const cardUrl = (o = {}) => {
  const p = new URLSearchParams();
  if (o.w) p.set('w', o.w);
  if (o.n != null) p.set('n', String(o.n));
  if (o.sub) p.set('sub', o.sub);
  if (o.cap) p.set('cap', o.cap);
  if (o.sig) p.set('sig', o.sig);
  return `${SITE}/api/card?${p.toString()}`;
};

// גימטריה רגילה (יסוד) — פונקציה טהורה, סופיות מקופלות לבסיס (method_hierarchy_ragil_foundation).
const RAGIL = { 'א':1,'ב':2,'ג':3,'ד':4,'ה':5,'ו':6,'ז':7,'ח':8,'ט':9,'י':10,'כ':20,'ך':20,'ל':30,'מ':40,'ם':40,'נ':50,'ן':50,'ס':60,'ע':70,'פ':80,'ף':80,'צ':90,'ץ':90,'ק':100,'ר':200,'ש':300,'ת':400 };
const ragil = (s) => Array.from(String(s || '')).reduce((a, c) => a + (RAGIL[c] || 0), 0);

// עמודים סטטיים — כותרת/תיאור + כרטיס שיתוף ייעודי (card) כדי שכל לינק יביא תמונה יפה ומסבירה
const STATIC = {
  '/': { title: "כי לה' המלוכה – SOD1820 | רמזי הגאולה, דילוגי אותיות ומחשבון גימטריה",
    desc: "וואו — האתר שמפצח את קוד המציאות. 13 שנות מחקר, דילוגי אותיות, גימטריה חיה, עץ מספרים ורמזי גאולה שיגרמו לך לומר «פלא פלאים». תיכנס ותראה מה יש פה.",
    card: { w: 'סוד 1820', sub: "כי לה' המלוכה · רמזי הגאולה", cap: 'מה המספרים יודעים עליך?' } },
  '/journey': { title: "המסע — כל מספר פותח עולם · " + SITE_NAME,
    desc: "צא למסע במפת המספרים — כל צעד פותח סוד חדש, וכל מספר מתחבר לבא אחריו. לא תאמין לאן זה מוביל. פלא פלאים.",
    card: { w: 'המסע', sub: 'מספר → מספר → סוד', cap: 'לאן זה יוביל אותך?' } },
  '/community/chat': { title: "הצ'אט החי — קוד המציאות בזמן אמת · " + SITE_NAME,
    desc: "וואו מה שקורה פה — בוא לדבר על מה שמתגלה עכשיו. קוד המציאות חי, בזמן אמת, עם חוקרים מכל הארץ. פלא פלאים.",
    card: { w: "הצ'אט החי", sub: 'קוד המציאות · בזמן אמת', cap: 'מה מתגלה עכשיו?' } },
  '/community/calculator': { title: "מחשבון גימטריה חינם — גלו את הסוד שבשם שלכם · " + SITE_NAME, desc: "רוצים לדעת מה מסתתר בשם שלכם? מחשבון הגימטריה החינמי והמדויק של SOD1820 — חישוב כל שם או מילה ב-8 שיטות, השוואה בין שני שמות וגילוי הקשרים הנסתרים בשפת המספרים.",
    card: { w: 'מחשבון הגימטריה', sub: 'חשבו כל מילה · שם · ביטוי', cap: 'מה מסתתר בשם שלכם?' } },
  '/code': { title: "חיפוש בצופן התנ\"כי עם AI — דילוגי אותיות בתורה ובתנ\"ך · " + SITE_NAME, desc: "חיפוש בצופן התנ\"כי בעזרת בינה מלאכותית — דילוגי אותיות (ELS), חישוב בתורה וחיפוש תבניות נסתרות בתנ\"ך.",
    card: { w: 'הצופן התנ"כי', sub: 'דילוגי אותיות · AI', cap: 'מה חבוי בתורה?' } },
  '/codes': { title: "ספריית הצפנים — כל דילוגי-האותיות · " + SITE_NAME, desc: "כל הצפנים שנחקרו ואומתו בסוד 1820 — דילוגי אותיות (ELS) עם המונח, הדילוג והממצאים. כל צופן בעמוד משלו. עדות — לא ניבוי.",
    card: { w: 'ספריית הצפנים', sub: 'דילוגי אותיות · ELS', cap: 'כל הצפנים שנחקרו ואומתו' } },
  '/post': { title: "פוסטים אחרונים · " + SITE_NAME, desc: "כל הפוסטים והתיעודים באתר SOD1820 — חיפוש, גימטריה וסינון.",
    card: { w: 'פוסטים', sub: 'החדשות והרמזים האחרונים', cap: 'מה מתגלה עכשיו?' } },
  '/beit-midrash': { title: "בית המדרש · " + SITE_NAME, desc: "לימוד שיטות הגימטריה — מסתתר, קדמי, מילוי, אלב\"ם, אתב\"ש ועוד.",
    card: { w: 'בית המדרש', sub: 'שיטות · חידושים · הצלבות', cap: 'בואו ללמוד את הסוד' } },
  '/timeline': { title: "ציר ההתגלות · " + SITE_NAME, desc: "ציר הזמן של אירועי הגאולה — כל תחנה מחוברת לפוסט המתעד ולתמונות הממצאים.",
    card: { w: 'ציר ההתגלות', sub: 'כל אירועי הגאולה — מחוברים', cap: 'המסע בזמן של סוד 1820' } },
  '/archive': { title: "ארכיון ההתגלות · " + SITE_NAME,
    desc: "וואו — אלפי תמונות שבהן המציאות עצמה חתומה במספרים. צפנים, ממצאים ורמזי גאולה שלא תאמין שקיימים. תיכנס ותראה מה יש פה. פלא פלאים.",
    card: { w: 'ארכיון ההתגלות', sub: 'אלפי תמונות · צפנים · ממצאים', cap: 'לא תאמין מה יש פה' } },
  '/map': { title: "מרכז הניווט · " + SITE_NAME, desc: "מפת האתר החיה — כל מערכות SOD1820 במקום אחד.",
    card: { w: 'מרכז הניווט', sub: 'כל מערכות סוד 1820', cap: 'מאיפה מתחילים?' } },
  '/community': { title: "קהילה · " + SITE_NAME, desc: "מרכז הפעילות של SOD1820 — צ'אט, תגובות, מחשבון קהילתי ופעילות אחרונה.",
    card: { w: 'הקהילה', sub: "צ'אט · תגובות · מחשבון", cap: 'הצטרפו לחוקרים' } },
  '/members': { title: "בני ההיכל · " + SITE_NAME, desc: "אזור המנויים — שיעורים, קורסים, עץ מתקדם וצפנים בלעדיים.",
    card: { w: 'בני ההיכל', sub: 'אזור המנויים', cap: 'הצטרפו להיכל' } },
  '/start': { title: "כאן מתחילים · " + SITE_NAME, desc: "מה זה SOD1820 ואיך מתחילים — גימטריה, ציר ההתגלות, עץ המספרים והצופן התנ\"כי בשתי דקות.",
    card: { w: 'כאן מתחילים', sub: 'הסוד של 1820 — בשתי דקות', cap: 'בואו נתחיל את המסע' } },
};

const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripHtml = (s = '') => String(s).replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

// WhatsApp לא מציג באופן אמין תמונות WebP בתצוגה המקדימה (פייסבוק כן). ממירים WebP
// מאחסון Supabase ל-JPEG דרך נקודת ה-render — שומר על יחס הממדים, ללא חיתוך — כך
// שיתוף תפילה/פוסט מביא תמונה גם בוואטסאפ, גם בפייסבוק וגם בטלגרם. jpg/png נשארים כמו שהם.
function waSafeImage(url) {
  if (!url || typeof url !== 'string') return url;
  const m = url.match(/^(https?:\/\/[^/]+)\/storage\/v1\/object\/public\/(.+?\.webp)(?:\?.*)?$/i);
  if (!m) return url;
  return `${m[1]}/storage/v1/render/image/public/${m[2]}?width=1200&quality=82`;
}
// ממדי התמונה ל-og:image:width/height — רק לכרטיס הדינמי (/api/card), שתמיד 1200×630.
// תמונות render/raw (webp→jpeg, תמונת פוסט) — היחס נשמר והגובה משתנה, ולכן לא מצהירים
// ממדים קבועים (הצהרה שגויה גרועה מהיעדר הצהרה: הרובוט חותך/מותח).
const ogImageDims = (url = '') => /\/api\/card/.test(url) ? { w: 1200, h: 630 } : null;
// סוג התמונה ל-og:image:type — עוזר לרובוטים להציג מיד בלי לנחש.
const ogImageType = (url = '') =>
  /\/api\/card/.test(url) ? 'image/png'
  : /\/render\/image\//.test(url) ? 'image/jpeg'
  : /\.png(\?|$)/i.test(url) ? 'image/png'
  : /\.webp(\?|$)/i.test(url) ? 'image/webp'
  : 'image/jpeg';

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
  let image = cardUrl(STATIC['/'].card);
  let type = 'website';
  let post = null;  // נתוני הפוסט (לתגיות article ו-JSON-LD)
  const canonical = SITE + (path === '/' ? '' : path);

  const key = path.replace(/\/$/, '') || '/';
  const ogHeaders = { apikey: ANON, Authorization: 'Bearer ' + ANON };
  if (key === '/gematria' || key === '/גימטריה') {
    // מחשבון הגימטריה — אם שותפו מילה+ערך (?w=&n=) → תמונת כרטיס ויראלית עם המילה.
    const w = String((req.query && req.query.w) || '').trim();
    const nq = parseInt(String((req.query && req.query.n) || ''), 10);
    if (w && Number.isFinite(nq)) {
      title = `${w} = ${nq} · ${SITE_NAME}`;
      desc = `"${w}" שווה ${nq} בגימטריה. מה המספר אומר עליכם? בדקו גם את השם שלכם במחשבון הגימטריה של סוד 1820.`;
      image = `${SITE}/api/card?w=${encodeURIComponent(w)}&n=${nq}`;
    } else {
      title = "מחשבון גימטריה חינם — חשבו כל מילה, שם או ביטוי · " + SITE_NAME;
      desc = "מחשבון הגימטריה של סוד 1820 — חשבו כל מילה, שם או ביטוי ב-8 שיטות, גלו מה שווה לו ובנו את קיר הגימטריה החי.";
      image = `${SITE}/api/card?w=${encodeURIComponent('מחשבון הגימטריה')}&sub=${encodeURIComponent('חשבו כל מילה · שם · ביטוי')}&cap=${encodeURIComponent('בדקו את השם שלכם · מה המספר אומר עליכם?')}&sig=gem`;
    }
  } else if (key === '/number') {
    // "הגוגל של המספרים" — דף הנחיתה
    title = "מנוע המספרים — הגוגל של המספרים · " + SITE_NAME;
    desc = "הקלידו מספר, שם או פסוק — וגלו את עץ הקשרים הנסתר שלו. המנוע מזהה לבד.";
    image = `${SITE}/api/card?w=${encodeURIComponent('מנוע המספרים')}&sub=${encodeURIComponent('הגוגל של המספרים')}&cap=${encodeURIComponent('הקלידו מספר או שם — וגלו את עץ הקשרים')}&sig=gem`;
  } else if (key === '/name' || key === '/שם') {
    // השער הויראלי — "מה השם שלך מסתיר?"
    title = "מה השם שלך מסתיר? · " + SITE_NAME;
    desc = "הקלידו את שמכם וגלו את הסוד הגימטרי שמאחוריו — מה השם שלכם אומר עליכם.";
    image = `${SITE}/api/card?w=${encodeURIComponent('מה השם שלך מסתיר?')}&sub=${encodeURIComponent('הקלידו שם · גלו את הסוד')}&cap=${encodeURIComponent('בדקו את השם שלכם · סוד 1820')}&sig=gem`;
  } else if (key === '/name-lab' || key === '/מעבדת-השם') {
    // 🔬 מעבדת-השם — עמוד-התוצאה שאותו משתפים (?w=<שם>). זו הלולאה הוויראלית:
    //    מישהו מחפש את שמו ומשתף → הצופה רואה «<שם> = <ערך>» + «מה מסתתר בשם שלך?» → מחפש את שלו.
    const w = String((req.query && req.query.w) || '').trim();
    if (w) {
      const val = ragil(w);
      title = `${w} = ${val} · ${SITE_NAME}`;
      desc = `הסוד שמאחורי השם "${w}" — ${w} = ${val} בגימטריה. מה מסתתר בשם שלך? גלו במעבדת-השם של סוד 1820.`;
      image = `${SITE}/api/card?w=${encodeURIComponent(w)}&sub=${encodeURIComponent(w + ' = ' + val)}&sig=gem`;
    } else {
      title = "מעבדת השם — גלו את הסוד שבשם שלכם · " + SITE_NAME;
      desc = "הקלידו את שמכם וגלו את הסוד הגימטרי שמאחוריו — גשרים, השוואות והקשרים נסתרים.";
      image = `${SITE}/api/card?w=${encodeURIComponent('מעבדת השם')}&sub=${encodeURIComponent('גלו את הסוד שבשם שלכם')}&sig=gem`;
    }
  } else if (STATIC[key]) {
    title = STATIC[key].title;
    desc = STATIC[key].desc;
    if (STATIC[key].card) image = cardUrl(STATIC[key].card);
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
        // תמונת שיתוף דינמית: כותרת ההתכנסות גדולה + המספרים.
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
      // ✦ עוגן-המהות (number_anchors) — אם למספר יש מהות מאומתת, מציגים אותה בתצוגת-השיתוף.
      try {
        const ar = await fetch(`${SUPABASE_URL}/rest/v1/number_anchors?value=eq.${n}&select=fact,hint&limit=1`, { headers: ogHeaders });
        const arows = await ar.json();
        const anc = Array.isArray(arows) && arows[0];
        if (anc && anc.fact) {
          title = `✦ ${stripHtml(anc.fact)} · ${SITE_NAME}`;
          desc = cleanDesc(`${stripHtml(anc.fact)}${anc.hint ? ' — ' + stripHtml(anc.hint) : ''} · פלא מאומת במנוע · סוד 1820`, 180);
        }
      } catch { /* fallback to generic */ }
      // תמונת שיתוף דינמית: המספר ענק + הביטויים השווים לו + כיתוב ויראלי.
      image = `${SITE}/api/card?n=${n}`;
    }
  } else if (key.startsWith('/codes/')) {
    // 🔠 עמוד-צופן קנוני (els_records) — כרטיס-שיתוף ממותג עם המונח והדילוג.
    // מקור-התמונה: image_url של הצופן (מנוע-הכרטיס) אם קיים, אחרת כרטיס /api/card ממותג.
    let slug = key.slice('/codes/'.length);
    try { slug = decodeURIComponent(slug); } catch { /* keep */ }
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/els_records?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=title,search_term,skip_distance,scope,image_url,positions&limit=1`, { headers: ogHeaders });
      const rows = await r.json();
      const c = Array.isArray(rows) && rows[0];
      if (c) {
        const scopeTxt = c.scope === 'tanakh' ? 'כל התנ״ך' : 'התורה';
        const findings = (c.positions && Array.isArray(c.positions.findings)) ? c.positions.findings.map(f => f && f.t).filter(Boolean) : [];
        title = `הצופן «${stripHtml(c.title || c.search_term)}» — דילוג ${c.skip_distance} · ${SITE_NAME}`;
        desc = cleanDesc(`דילוג-האותיות (ELS) של «${c.search_term}» ב${scopeTxt}, בדילוג ${c.skip_distance}${findings.length ? ' · ' + findings.slice(0, 6).join(' · ') : ''}. עדות — לא ניבוי · סוד 1820.`, 180) || DEFAULT_DESC;
        type = 'article';
        image = c.image_url ? waSafeImage(c.image_url)
          : `${SITE}/api/card?w=${encodeURIComponent(c.search_term)}&sub=${encodeURIComponent('צופן דילוג · דילוג ' + c.skip_distance)}&cap=${encodeURIComponent(findings.length ? findings.slice(0, 3).join(' · ') : 'דילוגי אותיות · סוד 1820')}`;
      }
    } catch { /* fallback to defaults */ }
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
          if (post.image_url) {
            image = post.image_url;
          } else {
            const ttl = stripHtml(post.title);
            const heroTitle = ttl.length > 46 ? ttl.slice(0, 46).replace(/\s+\S*$/, '') + '…' : ttl;
            const cat = Array.isArray(post.categories) && post.categories[0] ? stripHtml(post.categories[0]) : '';
            image = cardUrl({ w: heroTitle, sub: cat || "כי לה' המלוכה", cap: 'לקריאת הרמז המלא ←' });
          }
          type = 'article';
          break;
        }
      } catch { /* try next variant */ }
    }
  }

  // וידוא תמונת שיתוף ידידותית לוואטסאפ (WebP → JPEG דרך render) — לפני בניית המטא וה-JSON-LD.
  image = waSafeImage(image);
  const imgType = ogImageType(image);
  const imgDims = ogImageDims(image);

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
<meta property="og:image:secure_url" content="${esc(image)}"/>
<meta property="og:image:type" content="${imgType}"/>
${imgDims ? `<meta property="og:image:width" content="${imgDims.w}"/><meta property="og:image:height" content="${imgDims.h}"/>` : ''}
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
